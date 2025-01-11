/**
 * getQueryParams
 * @param url 
 * @returns Promise<Record<string, string>>
 */
function getQueryParams(url: string): Record<string, string> {
    const parsedUrl = new URL(url);
    
    const queryParams: Record<string, string> = {};
    
    parsedUrl.searchParams.forEach((value, key) => {
        queryParams[key] = value;
    });
    
    return queryParams;
}

export default getQueryParams;