import { Repository, Remote } from "../typings/git";
import { PullRequestApi, GitUrlParse, bitbucketHosts } from "../bitbucket/pullRequests";
import { Container } from "../container";
import fetch from 'node-fetch';
import { AuthProvider } from "../atlclients/authInfo";
import { Logger } from "../logger";
import { Pipeline, PipelineResult, PipelineStep, PipelineCommand } from "../pipelines/model";

export namespace PipelineApi {
  export async function getList(
    repository: Repository,
    branchName: string
  ): Promise<Pipeline[]> {
    const remotes = PullRequestApi.getBitbucketRemotes(repository);
    const accessToken = await getAccessToken();
    return Promise.all(remotes.map(remote => {
      return getListForRemote(remote, branchName, accessToken);
    })).then(arrays => {
      return [].concat.apply([], arrays);
    });
  }

  export async function getRecentActivity(repository: Repository): Promise<Pipeline[]> {
    const remotes = PullRequestApi.getBitbucketRemotes(repository);
    const accessToken = await getAccessToken();
    return Promise.all(remotes.map(remote => {
      return getPipelineResults(remote, accessToken);
    })).then(arrays => {
      return [].concat.apply([], arrays);
    });
  }

  export async function startPipeline(repository: Repository, branchName: string): Promise<Pipeline> {
    const remotes = PullRequestApi.getBitbucketRemotes(repository);
    if (remotes.length > 0) {
      const remote = remotes[0];
      const remoteUrl = remote.fetchUrl! || remote.pushUrl!;
      let parsed = GitUrlParse(remoteUrl);
      const bb = await bitbucketHosts.get(parsed.source)();
      return bb.pipelines.create({
        _body: {
          target: {
            ref_type: "branch",
            type: "pipeline_ref_target",
            ref_name: branchName
          }
        }, repo_slug: parsed.name, username: parsed.owner
      }).
        then((res: Bitbucket.Response<Bitbucket.Schema.Pipeline>) => res.data);
    }
    return Promise.reject("No remote associated with this repository.");
  }

  export async function getPipeline(repository: Repository, uuid: string): Promise<Pipeline> {
    const remotes = PullRequestApi.getBitbucketRemotes(repository);
    if (remotes.length > 0) {
      const remote = remotes[0];
      const remoteUrl = remote.fetchUrl! || remote.pushUrl!;
      let parsed = GitUrlParse(remoteUrl);
      const bb = await bitbucketHosts.get(parsed.source)();
      return bb.pipelines.get({ pipeline_uuid: uuid, repo_slug: parsed.name, username: parsed.owner })
        .then((res: Bitbucket.Schema.PaginatedPipelines) => {
          return pipelineForPipeline(res.data);
        });
    }
    return Promise.reject();
  }

  export async function getSteps(repository: Repository, uuid: string): Promise<PipelineStep[]> {
    const remotes = PullRequestApi.getBitbucketRemotes(repository);
    if (remotes.length > 0) {
      const remote = remotes[0];
      const remoteUrl = remote.fetchUrl! || remote.pushUrl!;
      let parsed = GitUrlParse(remoteUrl);
      const bb = await bitbucketHosts.get(parsed.source)();
      return bb.pipelines.listSteps({ pipeline_uuid: uuid, repo_slug: parsed.name, username: parsed.owner })
        .then((res: Bitbucket.Schema.PaginatedPipelines) => {
          return res.data.values!.map((s: any) => pipelineStepForPipelineStep(s));
        });
    }
    return Promise.reject();
  }

  async function getAccessToken(): Promise<string> {
    return Container.authManager.getAuthInfo(
      AuthProvider.BitbucketCloud
    ).then(authInfo => authInfo!.access);
  }

  async function getListForRemote(
    remote: Remote,
    branchName: string,
    accessToken: string
  ): Promise<Pipeline[]> {
    return getPipelineResults(remote, accessToken, `target.branch=${branchName}`);
  }

  async function getPipelineResults(
    remote: Remote,
    accessToken: string,
    query?: string
  ): Promise<Pipeline[]> {
    let parsed = GitUrlParse(remote.fetchUrl! || remote.pushUrl!);
    const bbBase = "https://api.bitbucket.org/";
    const pipelinesPath = `2.0/repositories/${parsed.owner}/${parsed.name}/pipelines/`;
    var queryParameters = "sort=-created_on";
    if (query) {
      queryParameters = `${query}&sort=-created_on`;
    }
    return fetch(`${bbBase}${pipelinesPath}?${queryParameters}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      }
    })
      .then(res => res.json())
      .then((res: Bitbucket.Schema.PaginatedPipelines) => {
        if (res.values) {
          return res.values.map(pipeline => {
            return pipelineForPipeline(pipeline);
          });
        }
        return [];
      })
      .catch((err: any) => {
        Logger.error(new Error(`Error getting pipelines ${err}`));
        return Promise.reject();
      });
  }
}

function pipelineForPipeline(pipeline: Bitbucket.Schema.Pipeline): Pipeline {
  var name = undefined;
  var avatar = undefined;
  if (pipeline.creator) {
    name = pipeline.creator.display_name;
    if (pipeline.creator.links && pipeline.creator.links.avatar) {
      avatar = pipeline.creator.links.avatar.href;
    }
  }

  return {
    build_number: pipeline.build_number!,
    created_on: pipeline.created_on!,
    creator_name: name,
    creator_avatar: avatar,
    completed_on: pipeline.completed_on,
    //              repository: pipeline.repository!, 
    state: {
      name: pipeline.state!.name,
      type: pipeline.state!.type,
      result: resultForResult(pipeline.state!.result)
    },
    target: {
      ref_name: pipeline.target!.ref_name
    },
    duration_in_seconds: pipeline.duration_in_seconds,
    uuid: pipeline.uuid!,
  };
}

function resultForResult(result?: any): PipelineResult | undefined {
  if (!result) {
    return undefined;
  }

  return {
    name: result.name,
    type: result.type
  };
}

function pipelineStepForPipelineStep(step: any): PipelineStep {
  return {
    run_number: step.run_number,
    uuid: step.uuid,
    name: step.name,
    started_on: step.started_on,
    completed_on: step.completed_on,
    duration_in_seconds: step.duration_in_seconds,
    state: {
      name: step.state!.name,
      type: step.state!.type,
      result: resultForResult(step.state!.result)
    },
    setup_commands: pipelineCommandsForPipelineCommands(step.setup_commands),
    teardown_commands: pipelineCommandsForPipelineCommands(step.teardown_commands),
    script_commands: pipelineCommandsForPipelineCommands(step.script_commands),
  };
}

function pipelineCommandsForPipelineCommands(commands?: any[]): PipelineCommand[] {
  if (!commands) {
    return [];
  }
  return commands.map((command: any) => {
    return {
      action: command.action,
      command: command.command,
      name: command.name
    };
  });
}