import { CartItem, StoreDiscountList } from "../cart/cart.types";

export interface DeliveryCharges
{
    cartId: string;
    customerId: string;
    delivery: DeliveryDetails;
    deliveryProviderId?: string;
    storeId: string;
}

export interface CheckoutItems
{
    cartId              : string;
    selectedItemId      : string[];
    deliveryQuotationId : string;
    deliveryType        : string;
    storeVoucherCode?   : string;
    deliveryProviderId  : string;
    orderNotes?         : string;
    platformVoucherCode?: string;
    deliveryPrice?: {
        deliveryFee: number,
        discountAmount: number,
        discountedPrice: number
    };
    selfPickupInfo: {
        name        : string,
        email       : string,
        phoneNumber : string
    }
}


export interface DeliveryDetails
{
    deliveryAddress: string;
    deliveryCity: string;
    deliveryContactEmail: string;
    deliveryContactName: string;
    deliveryContactPhone: string;
    deliveryCountry: string;
    deliveryPostcode: string;
    deliveryState: string;
}

export interface DeliveryProviderGroup
{
    providerId: string;
    deliveryProviders: DeliveryProvider[];
}

export interface DeliveryProvider
{
    deliveryPeriod: {
        id: string;
        description: string;
        name: string;
    };
    deliveryType: string;
    isError: boolean;
    message?: string;
    price: number;
    providerId: string;
    providerImage: string;
    providerName: string;
    refId: string;
    validUpTo: string;
}

export interface DeliveryProviders
{
    cartId: string;
    quotation: DeliveryProvider[];
}

export interface CartDiscount
{
    cartSubTotal                : number;
    deliveryDiscount            : number;
    deliveryDiscountDescription : string;
    deliveryDiscountMaxAmount   : number;
    discountCalculationType     : string;
    discountCalculationValue    : number;
    discountId?                 : string;
    discountMaxAmount           : number;
    discountType                : string;
    subTotalDiscount            : number;
    subTotalDiscountDescription : string;
    storeServiceChargePercentage: number;
    storeServiceCharge          : number;
    deliveryCharges             : number;
    cartGrandTotal              : number;
    voucherDeliveryDiscount     : number;
    voucherDiscountMaxAmount    : number;
    voucherDiscountType         : string;
    voucherSubTotalDiscount     : number;
    voucherDeliveryDiscountDescription  : string;
    voucherDiscountCalculationType      : string;
    voucherDiscountCalculationValue     : number;
    voucherSubTotalDiscountDescription  : string;
    platformVoucherSubTotalDiscount    : number;
    platformVoucherDeliveryDiscount     : number;
    storeDiscountList?          : StoreDiscountList[];
}

export interface Payment
{
    hash: string;
    isSuccess: boolean;
    orderCreated?: {
        createdDate: string;
        spErrorCode: number;
    };
    paymentLink: string;
    providerId: string;
    sysTransactionId: string;
}

export interface Order
{
    appliedDiscount: number;
    appliedDiscountDescription: string;
    beingProcess: string;
    cartId: string;
    completionStatus: string;
    created: string;
    customer: string;
    customerId: string;
    customerNotes: string;
    deliveryCharges: number;
    deliveryDiscount: number;
    deliveryDiscountDescription: string;
    deliveryDiscountMaxAmount: number;
    deliveryType: string;
    discountCalculationType: string;
    discountCalculationValue: number;
    discountId: string;
    discountMaxAmount: number;
    id: string;
    invoiceId: string;
    klCommission: number;
    orderPaymentDetail: {
        accountName: string;
        couponId: string;
        deliveryQuotationAmount:  number;
        deliveryQuotationReferenceId: string;
        gatewayId: string;
        orderId: string;
        time: string;
    }
    orderShipmentDetail: {
        address: string;
        city: string;
        country: string;
        customerTrackingUrl: string;
        deliveryProviderId: string;
        deliveryType: string;
        email: string;
        merchantTrackingUrl: string;
        orderId: string;
        phoneNumber: string;
        receiverName: string;
        state: string;
        storePickup: boolean;
        trackingNumber: string;
        trackingUrl: string;
        zipcode: string;
    }
    paymentStatus: string;
    paymentType: string;
    privateAdminNotes: string;
    store: string;
    storeId: string;
    storeServiceCharges: number;
    storeShare: number;
    subTotal: number;
    total: number;
    updated: string;
}

export interface Address
{
    address     : string;
    city        : string;
    country     : string;
    customerId  : string;
    email       : string;
    id          : string;
    name        : string;
    phoneNumber : string;
    postCode    : string;
    state       : string;
}

export interface GroupOrder
{
    appliedDiscount: number;
    customer: string;
    customerId: string;
    deliveryCharges: number;
    deliveryDiscount: number;
    id: string;
    orderList: []
    // platformVoucherDiscount: null
    platformVoucherId: string;
    shipmentEmail: string;
    shipmentName: string;
    shipmentPhoneNumber: string;
    subTotal: number;
    total: number;
}

export interface AXTResponseBody
{
    error           : boolean;
    message         : string;
    url             : string;
    secondary_url   : string;
}

export interface AXTRequestBody
{
    user_id        : string;
    transaction_id : string;
    name           : string;
    email          : string;
    mobile         : string;
    description    : string;
    redirect_url   : string;
    callback_url   : string;
    callback_token : string;
}