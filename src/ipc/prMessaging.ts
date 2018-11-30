import { Message } from "./messaging";

// PRData is the message that gets sent to the PullRequestPage react view containing the PR details.
export interface PRData extends Message {
    currentUser?: Bitbucket.Schema.User;
    pr?: Bitbucket.Schema.Pullrequest;
    commits?: Bitbucket.Schema.Commit[];
    comments?: Bitbucket.Schema.Comment[];
    currentBranch: string;
}

export function isPRData(a: Message): a is PRData {
    return (<PRData>a).type === 'update';
}

export interface CheckoutResult extends Message {
    error?: string;
    currentBranch: string;
}

export function isCheckoutError(a: Message): a is CheckoutResult {
    return (<CheckoutResult>a).type === 'checkout';
}