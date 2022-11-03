export interface User
{
    id: string;
    name: string;
    email: string;
    avatar?: string;
    status?: string;
    username?: string;
    channel?: string;
}

export interface Customer
{
    id: string;
    username: string;
    name: string;
    email: string;
    phoneNumber?: number;
    locked: boolean;
    deactivated: boolean;
    created: string;
    updated: string;
    roleId: string;
    storeId: string;
    customerAddress: CustomerAddress[]
    password?: string;
}

export interface CustomerAddress
{
    address: string;
    city: string;
    country: string;
    customerId: string;
    email: string;
    id?: string;
    name: string;
    phoneNumber: string;
    postCode: string;
    state: string;
    isDefault: boolean;
    latitude: string;
    longitude: string;
}

export interface Client
{
    id: string;
    username: string;
    name: string;
    regionCountry?: RegionCountry;
    email: string;
    avatar?: string;
    status?: string;
    role: UserRole
    locked: string;
    deactivated: string;
    countryId?: string;
    created: string;
    updated: string;
    roleId: string;
}

export interface RegionCountry
{
    id?: string;
    name?: string;
    region?: string;
}


export enum UserRole {
    Admin = 'SUPER_USER',
    Merchant = 'STORE_OWNER',
    Customer ='CUSTOMER'
}

export interface HttpResponse<T>{
    message?: string;
    data?:T
    path : string;
    status: number;
    timestamp:string;
}

export interface UserSession
{
    created : string;
    device  : string;
    browser : string;
    id?     : string;
    ip      : string;
    os      : string;
    updated : string;
}