import { DeliveryProvider } from "../checkout/checkout.types";
import { Store, StoreSnooze } from "../store/store.types";

export interface Cart
{
    id?: string;
    customerId: string;
    storeId: string;
    created?: string;
    updated?: string;
    store?: Store;
}

export interface CartWithDetails
{
    cartItems?              : CartItem[],
    customerId?             : string;
    deliveryQuotationId?    : string;
    deliveryType?           : string;
    id                      : string;
    isOpen                  : boolean;
    store                   : Store;
    storeId                 : string;
    storeVoucherCode        : string;
    deliveryProviderId      : string;
    orderNote?              : string;
    storeOpen?              : boolean;
    storeSnooze?            : StoreSnooze;
    deliveryQuotations?     : DeliveryProvider[];
}

export interface CartPagination
{
    length      : number;
    size        : number;
    page        : number;
    lastPage    : number;
    startIndex  : number;
    endIndex    : number;
}

export interface CustomerCart
{
    cartList: Cart[];
    totalItem: number;
}

export interface CartItem
{
    id?: string;
    quantity: number;
    cartId: string;
    productId: string;
    itemCode: string;
    price?: number;
    productPrice?: number;
    weight?: string;
    productName?: string;
    specialInstruction?: string;
    discountId?: string;
    normalPrice?: null,
    discountLabel?: string;
    discountCalculationType?: string;
    discountCalculationValue?: null,
    cartSubItem?: [];
    productInventory?: ProductInventory;
    productAsset?: {
        id: string;
        isThumbnail: boolean;
        itemCode: string;
        name: string;
        productId: string;
        url: string;
    }
    SKU?: string;
    cartItemAddOn?: [];
    totalPrice? : number;
}

export interface ProductInventory
{
    itemCode: string;
    price: number;
    compareAtprice: number;
    quantity: number;
    product: Product;
    productInventoryItems: [],
    sku: string;
}

export interface Product
{
    id: string;
    name: string;
    storeId: string;
    categoryId: string;
    thumbnailUrl: string;
    vendor: string;
    description: string;
    region: string;
    seoUrl: string;
    trackQuantity: boolean;
    allowOutOfStockPurchases: boolean;
    minQuantityForAlarm: number;
    isPackage: boolean;
    status: string;
}

export interface DiscountOfCartGroup 
{
    platformVoucherDeliveryDiscount             : number;
    platformVoucherDeliveryDiscountDescription  : string;
    platformVoucherDiscountCalculationType      : string;
    platformVoucherDiscountCalculationValue     : number;
    platformVoucherDiscountMaxAmount            : number;
    platformVoucherDiscountType                 : string;
    platformVoucherSubTotalDiscount             : number;
    platformVoucherSubTotalDiscountDescription  : string;
    storeDiscountList                           : StoreDiscountList[];
    sumCartDeliveryCharge                       : number;
    sumCartGrandTotal                           : number;
    sumCartSubTotal                             : number;
    sumDeliveryDiscount                         : number;
    sumSubTotalDiscount                         : number;
    platformVoucherName                         : string;
    sumServiceCharge                            : number;
}

export interface StoreDiscountList
{
    cartDeliveryCharge                      : number;
    cartGrandTotal                          : number;
    cartSubTotal                            : number;
    deliveryDiscount                        : number;
    deliveryDiscountDescription             : string;
    deliveryDiscountMaxAmount               : number;
    discountCalculationType                 : string;
    discountCalculationValue                : number;
    discountId                              : string;
    discountMaxAmount                       : number;
    discountType                            : string;
    storeServiceCharge                      : number;
    storeServiceChargePercentage            : number;
    storeVoucherDeliveryDiscount            : number;
    storeVoucherDeliveryDiscountDescription : string;
    storeVoucherDiscountCalculationType     : string;
    storeVoucherDiscountCalculationValue    : number;
    storeVoucherDiscountMaxAmount           : number;
    storeVoucherDiscountType                : string;
    storeVoucherSubTotalDiscount            : number;
    storeVoucherSubTotalDiscountDescription : string;
    subTotalDiscount                        : number;
    subTotalDiscountDescription             : string;
    voucherDeliveryDiscount                 : number;
    voucherDeliveryDiscountDescription      : string;
    voucherDiscountCalculationType          : string;
    voucherDiscountCalculationValue         : number;
    voucherDiscountMaxAmount                : number;
    voucherDiscountType                     : string;
    voucherSubTotalDiscount                 : number;
    voucherSubTotalDiscountDescription      : string;
    cartId                                  : string;
}

export interface SelectedCart 
{
    carts: { 
        id: string, 
        cartItem: { 
            id: string, 
            selected: boolean
        }[], 
        selected: boolean, 
        minDeliveryCharges?: number, 
        maxDeliveryCharges?: number,
        description: {
            isOpen: boolean,
            value?: string
        },
        deliveryQuotationId: string,
        deliveryType: string
    }[], 
    selected: boolean 
}