export function handleBrokenImageForSite(ee: ErrorEvent, siteBaseUrl: string) {
    if ((ee?.target as HTMLElement)?.nodeName === 'IMG') {
        const targetEL = ee.target as HTMLImageElement;
        const originalSrc = targetEL.getAttribute('atlascode-original-src');
        const baseUrl = new URL(siteBaseUrl);
        if (originalSrc) {
            const href = new URL(originalSrc, baseUrl);
            // only add hyperlink node for relative URLs or URLs matching the base URL of the site
            if (href.hostname !== baseUrl.hostname) {
                return;
            }

            const hyperlink = document.createElement('a');
            hyperlink.href = href.toString();
            targetEL.title = `${targetEL.title} - Click to view in browser`;

            var parent = targetEL.parentNode!;
            parent.replaceChild(hyperlink, targetEL);
            hyperlink.appendChild(targetEL);
        }
    }
}
