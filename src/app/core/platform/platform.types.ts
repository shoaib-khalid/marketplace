export interface Platform
{
    id?         : string;
    name?       : string;
    logo?       : string;
    logoDark?   : string;
    logoSquare? : string;
    slug?       : string;
    url?        : string;
    country?    : string;
    favicon16?  : string;
    favicon32?  : string;
    gacode?     : string;
    currency?   : string;
    platformDetails?   : {
        adsImageUrl : string;
        email       : string;
        fbUrl       : string;    
        instaUrl    : string;
        phoneNumber : string;
        platformId  : string;
        whatsappUrl : string;
        businessReg : string;
        address     : string;
        actionAdsUrl: string;
    };
    deliveryProviders? : PlatformDeliveryProvider[];
    paymentProviders?  : PlatformPaymentProvider[];
}

export interface PlatformDeliveryProvider 
{
    id              : number;
    platformId      : string;
    providerImage   : string;
    providerName    : string;
}

export interface PlatformPaymentProvider 
{
    id              : number;
    platformId      : string;
    providerImage   : string;
    providerName    : string;
}

export interface PlatformTag
{
id          : string;
property    : string;
content     : string;
name        : string;
platformId  : string;
}