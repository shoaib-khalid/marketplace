export interface CustomerActivity
{
    browserType?: string;
    created?    : string;
    customerId? : string;
    deviceModel?: string;
    errorOccur? : string;
    errorType?  : string;
    id?         : string;
    ip?         : string;
    os?         : string;
    pageVisited?: string;
    sessionId?  : string;
    storeId?    : string;
    latitude?   : string;
    longitude?  : string;
    channel?    : string;
    // address     : string;
    // postcode    : string;
    // city        : string;
    // state       : string;
    // country     : string;
    cart?       : string[];
}