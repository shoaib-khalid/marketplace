import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, ReplaySubject } from 'rxjs';
import { filter, map, switchMap, take, tap } from 'rxjs/operators';
import { AppConfig } from 'app/config/service.config';
import { JwtService } from 'app/core/jwt/jwt.service';
import { LogService } from 'app/core/logging/log.service';
import { StoresService } from 'app/core/store/store.service';
import { Customer } from 'app/core/user/user.types';
import { Address, CartDiscount, CheckoutItems, DeliveryCharges, DeliveryProvider, DeliveryProviders } from './checkout.types';
import { AuthService } from 'app/core/auth/auth.service';
import { Cart, CartPagination, CartWithDetails, DiscountOfCartGroup } from 'app/core/cart/cart.types';
import { CartService } from 'app/core/cart/cart.service';

@Injectable({
    providedIn: 'root'
})
export class CheckoutService
{
    private _address: ReplaySubject<Address> = new ReplaySubject<Address>(1);
    private _addresses: ReplaySubject<Address[]> = new ReplaySubject<Address[]>(1);

    private _cartWithDetails: ReplaySubject<CartWithDetails> = new ReplaySubject<CartWithDetails>(1);
    private _cartsWithDetails: ReplaySubject<CartWithDetails[]> = new ReplaySubject<CartWithDetails[]>(1);
    private _checkoutItems: ReplaySubject<CheckoutItems[]> = new ReplaySubject<CheckoutItems[]>(1);
    private _cartsWithDetailsPagination: ReplaySubject<CartPagination> = new ReplaySubject<CartPagination>(1);

    private _cartSummary: ReplaySubject<DiscountOfCartGroup | null> = new ReplaySubject<DiscountOfCartGroup | null>(1);

    /**
     * Constructor
     */
    constructor(
        private _httpClient: HttpClient,
        private _apiServer: AppConfig,
        private _storeService: StoresService,
        private _jwt: JwtService,
        private _logging: LogService,
        private _authService: AuthService,
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Setter for saveMyInfo
     */
    set saveMyInfo(value: string) {
        localStorage.setItem('saveMyInfo', value);
    }

    /**
     * Getter for cartId
     */
    get saveMyInfo$(): string
    {
        return localStorage.getItem('saveMyInfo') ?? '';
    }

    /**
    * Getter for orders
    */
    get customerAddress$(): Observable<any>
    {
        return this._address.asObservable();
    }

    get customerAddresses$(): Observable<Address[]>
    {
        return this._addresses.asObservable();
    }

    get cartWithDetails$(): Observable<CartWithDetails>
    {
        return this._cartWithDetails.asObservable();
    }

    get cartsWithDetails$(): Observable<CartWithDetails[]>
    {
        return this._cartsWithDetails.asObservable();
    }

    get checkoutItems$(): Observable<CheckoutItems[]>
    {
        return this._checkoutItems.asObservable();
    }

    /**
    * Getter for cart pagination
    */
    get cartsWithDetailsPagination$(): Observable<CartPagination>
    {
        return this._cartsWithDetailsPagination.asObservable();
    }

    /**
     * Cart Summary
     */

    get cartSummary$(): Observable<DiscountOfCartGroup>
    {
        return this._cartSummary.asObservable();
    }

    set cartSummary(value: DiscountOfCartGroup)
    {
        this._cartSummary.next(value);
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    resolveCheckout(checkoutItems: CheckoutItems[]): Observable<any>
    {
        return of(true).pipe(
            map(()=>{
                this.getCartsWithDetails({cartIdList: checkoutItems.map(item => item.cartId), page:0 ,pageSize: 5, includeEmptyCart: false}, checkoutItems).subscribe();
            })
        );
    }

    /**
     * Get the current logged in cart data
     */
    getCartsWithDetails(params: { 
        page                    : number,
        pageSize                : number,
        cartIdList?             : string[],
        storeId?                : string,
        customerId?             : string,
        includeEmptyCart?       : boolean
    } = {
        cartIdList              : [],
        page                    : 0, 
        pageSize                : 10, 
        storeId                 : null, 
        customerId              : null,
        includeEmptyCart        : false,
    }, checkoutItems: CheckoutItems[] = null):
    Observable<{ pagination: CartPagination; carts: Cart[] }>
    {
        let orderService = this._apiServer.settings.apiServer.orderService;
        //let accessToken = this._jwt.getJwtPayload(this.accessToken).act;
        let accessToken = "accessToken";

        const header = {
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
            params: params
        };

        // Delete empty value
        Object.keys(header.params).forEach(key => {
            if (Array.isArray(header.params[key])) {
                header.params[key] = header.params[key].filter(element => element !== null)
            }
            if (header.params[key] === null || (header.params[key].constructor === Array && header.params[key].length === 0)) {
                delete header.params[key];
            }
        });        

        return this._httpClient.get<any>(orderService +'/carts/details', header).
            pipe(
                tap((response) => {

                    this._logging.debug("Response from CheckoutService (getCartsDetails)",response);

                    let _pagination = {
                        length: response.data.totalElements,
                        size: response.data.size,
                        page: response.data.number,
                        lastPage: response.data.totalPages,
                        startIndex: response.data.pageable.offset,
                        endIndex: response.data.pageable.offset + response.data.numberOfElements - 1
                    }

                    this._cartsWithDetailsPagination.next(_pagination);

                    // Filter out cartItems that were not included in selectedItems
                    let _checkoutItems: CartWithDetails[] = response.data.content;
                    _checkoutItems.forEach(item => {
                        let index = checkoutItems ? checkoutItems.findIndex(element => element.cartId === item.id) : -1;
                        let toMaintainCartItems = item.cartItems;
                        if (index > -1) {
                            let toMaintain = new Set(checkoutItems[index].selectedItemId);
                            toMaintainCartItems = item.cartItems.filter(element => toMaintain.has(element.id));
                            item.orderNote = checkoutItems[index].orderNotes;                            
                        }
                        item.cartItems = toMaintainCartItems;
                    });
                    this._cartsWithDetails.next(_checkoutItems);

                    // checkoutListBody 
                    this._checkoutItems.next(checkoutItems);
                })
            );
    }

    /**
     * Delete cart
     * 
     * @param cartId 
     * @param itemId 
     * @returns 
     */
    deleteCart(cartId: string): Observable<Cart>
    {
        let orderService = this._apiServer.settings.apiServer.orderService;
        //let accessToken = this._jwt.getJwtPayload(this.accessToken).act;
        let accessToken = "accessToken";

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`)
        };

        return of(null);
        
        // this.carts$.pipe(
        //     take(1),
        //     switchMap(carts => this._httpClient.delete<any>(orderService + '/carts/' + cartId, header)
        //     .pipe(
        //         map((response) => {
        //             this._logging.debug("Response from CartService (deleteCart)", response);

        //             let index = carts.findIndex(item => item.id === cartId);

        //             if (index > -1) {
        //                 // Delete the cartItems
        //                 carts.splice(index, 1);

        //                 // Update the products
        //                 this._carts.next(carts);
        //             }

        //             return response["data"];
        //         })
        //     ))
        // );
    }

    /**
     * Get the Customer Info
     */
    getCustomerInfo(storeId: string, email: string = null, phoneNumber: string = null): Observable<Customer>
    {
        let userService = this._apiServer.settings.apiServer.userService;
        //let accessToken = this._jwt.getJwtPayload(this.accessToken).act;
        let accessToken = "accessToken";

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
            params: {
                email,
                phoneNumber
            }
        };

        if (header.params.email === null) delete header.params.email;
        if (header.params.phoneNumber === null) delete header.params.phoneNumber;

        return this._httpClient.get<any>(userService + '/stores/' + storeId + '/customers/', header)
            .pipe(
                map((response) => {
                    this._logging.debug("Response from StoresService (getCustomerInfo)",response);

                    return response["data"].content[0];
                })
            );
    }

    postToRetrieveDeliveryCharges(deliveryCharges: DeliveryCharges) : Observable<DeliveryProvider[]>
    {
        let deliveryService = this._apiServer.settings.apiServer.deliveryService;
        //let accessToken = this._jwt.getJwtPayload(this.accessToken).act;
        let accessToken = "accessToken";

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`)
        };

        return this._httpClient.post<any>(deliveryService + '/orders/getprice', deliveryCharges, header)
            .pipe(
                map((response) => {
                    this._logging.debug("Response from StoresService (postToRetrieveDeliveryCharges)",response);

                    return response["data"];
                })
            );
    }

    postToRetrieveDeliveriesCharges(deliveryCharges: DeliveryCharges[]) : Observable<DeliveryProviders[]>
    {
        let deliveryService = this._apiServer.settings.apiServer.deliveryService;
        //let accessToken = this._jwt.getJwtPayload(this.accessToken).act;
        let accessToken = "accessToken";

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`)
        };

        return this._httpClient.post<any>(deliveryService + '/orders/getPrices', deliveryCharges, header)
            .pipe(
                map((response) => {
                    this._logging.debug("Response from StoresService (postToRetrieveDeliveriesCharges)",response);

                    return response["data"];
                })
            );
    }

    /**
     * Get Discount
     */
    getDiscountOfCart(id: string, deliveryQuotationId: string = null, deliveryType: string): Observable<CartDiscount>
    {
        let orderService = this._apiServer.settings.apiServer.orderService;
        //let accessToken = this._jwt.getJwtPayload(this.accessToken).act;
        let accessToken = "accessToken";

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
            params: {
                deliveryQuotationId,
                deliveryType
            }
        };

        if (deliveryQuotationId === null) { delete header.params.deliveryQuotationId; }

        return this._httpClient.get<any>(orderService + '/carts/'+ id +'/discount', header)
            .pipe(
                map((response) => {
                    this._logging.debug("Response from StoresService (getDiscountOfCart)",response);

                    return response["data"];
                })
            );
    }

    getSubTotalDiscount(id: string): Observable<CartDiscount>
    {
        let orderService = this._apiServer.settings.apiServer.orderService;
        //let accessToken = this._jwt.getJwtPayload(this.accessToken).act;
        let accessToken = "accessToken";

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`)
        };

        return this._httpClient.get<any>(orderService + '/carts/'+ id +'/subtotaldiscount', header)
            .pipe(
                map((response) => {
                    this._logging.debug("Response from StoresService (getSubTotalDiscount)",response);

                    return response["data"];
                })
            );
    }

    postPlaceOrder(cartId: string, orderBody, saveInfo: boolean) : Observable<any>
    {
        let orderService = this._apiServer.settings.apiServer.orderService;
        //let accessToken = this._jwt.getJwtPayload(this.accessToken).act;
        let accessToken = "accessToken";

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
            params: {
                cartId,
                saveCustomerInformation: saveInfo
            }
        };

        return this._httpClient.post<any>(orderService + '/orders/placeOrder', orderBody, header)
            .pipe(
                map((response) => {
                    this._logging.debug("Response from StoresService (postPlaceOrder)",response);

                    return response["data"];
                })
            );
    }

    postPlaceGroupOrder( orderBodies, saveInfo: boolean, platformVoucherCode: string = null) : Observable<any>
    {
        let orderService = this._apiServer.settings.apiServer.orderService;
        //let accessToken = this._jwt.getJwtPayload(this.accessToken).act;
        let accessToken = "accessToken";

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
            params: {
                saveCustomerInformation: saveInfo,
                platformVoucherCode: platformVoucherCode
            }
        };

        if (platformVoucherCode === null) { delete header.params.platformVoucherCode; }

        return this._httpClient.post<any>(orderService + '/orders/placeGroupOrder', orderBodies, header)
            .pipe(
                map((response) => {
                    this._logging.debug("Response from StoresService (postPlaceGroupOrder)",response);

                    return response["data"];
                })
            );
    }

    postMakePayment(paymentBody) : Observable<any>
    {
        let paymentService = this._apiServer.settings.apiServer.paymentService;
        //let accessToken = this._jwt.getJwtPayload(this.accessToken).act;
        let accessToken = "accessToken";

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`)
        };

        return this._httpClient.post<any>(paymentService + '/payments/makePayment', paymentBody, header)
            .pipe(
                map((response) => {
                    this._logging.debug("Response from StoresService (postMakePayment)",response);

                    return response["data"];
                })
            );
    }

    // -----------------------------------------------------------------------------------------------------
    //                                         Customer Address
    // -----------------------------------------------------------------------------------------------------

    getCustomerAddress (id: string) {
        let userService = this._apiServer.settings.apiServer.userService;
        //let accessToken = this._jwt.getJwtPayload(this.accessToken).act;
        let accessToken = "accessToken";
        let customerId = this._jwt.getJwtPayload(this._authService.jwtAccessToken).uid;

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`)
        };

        return this._httpClient.get<any>(userService + '/customer/' + customerId + '/address', header)
            .pipe(
                map((response) => {
                    this._logging.debug("Response from UserService (getCustomerAddress)",response);

                    this._addresses.next(response["data"].content);
                })
            );
    }
    postCustomerAddress(id: string, customerAddressBody) : Observable<Address>
    {
        let userService = this._apiServer.settings.apiServer.userService;
        //let accessToken = this._jwt.getJwtPayload(this.accessToken).act;
        let accessToken = "accessToken";
        let customerId = this._jwt.getJwtPayload(this._authService.jwtAccessToken).uid;

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`)
        };

        return this.customerAddresses$.pipe(
            take(1),
            switchMap( addresses => this._httpClient.post<any>(userService + '/customer/' + customerId + '/address', customerAddressBody, header)
            .pipe(
                map((response) => {
                    this._logging.debug("Response from CheckoutService (postCustomerAddress)",response);

                    const updatedAddresses = addresses;

                    updatedAddresses.unshift(response["data"]);                    
                    
                    this._addresses.next(updatedAddresses);

                    return response["data"];
                })
            ))
        );
    }

    /**
    * Update address
    *
    * @param id
    * @param address
    */
    updateCustomerAddress(id: string, body: Address): Observable<any>
    {
        let userService = this._apiServer.settings.apiServer.userService;
        let accessToken = "accessToken";
        let customerId = this._jwt.getJwtPayload(this._authService.jwtAccessToken).uid;

        const header = {
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
        };

        return this.customerAddresses$.pipe(
            take(1),
            // switchMap(discounts => this._httpClient.post<InventoryDiscount>('api/apps/ecommerce/inventory/discount', {}).pipe(
            switchMap(addresses => this._httpClient.put<Address>(userService + '/stores/' + customerId + '/address/' +  id , body , header).pipe(
                map((updatedAddress) => {

                    this._logging.debug("Response from CheckoutService (UpdateAddress)",updatedAddress);

                    // Find the index of the updated discount
                    const index = addresses.findIndex(item => item.id === id);

                    // Update the discount
                    addresses[index] = { ...addresses[index], ...updatedAddress["data"]};

                    // Update the discounts
                    this._addresses.next(addresses);

                    // Return the updated discount
                    return updatedAddress["data"];
                }),
                switchMap(updatedAddress => this.customerAddress$.pipe(
                    take(1),
                    filter(item => item && item.id === id),
                    tap(() => {

                        // Update the discount if it's selected
                        this._address.next(updatedAddress["data"]);

                        // Return the updated discount
                        return updatedAddress["data"];
                    })
                ))
            ))
        );
    }

    deleteCustomerAddress(addressId:string)  : Observable<boolean> {

        let userService = this._apiServer.settings.apiServer.userService;
        let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
        let customerId = this._jwt.getJwtPayload(this._authService.jwtAccessToken).uid;

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`)
        };        

        return this.customerAddresses$.pipe(
            take(1),
            switchMap(addresses => this._httpClient.delete(userService + '/customer/' + customerId + '/address/' + addressId, header)
            .pipe(
                map((status: number) => {

                    this._logging.debug("Response from CheckoutService (deleteCustomerAddress)",status);

                    // Find the index of the deleted discount
                    const index = addresses.findIndex(item => item.id === addressId);

                    // Delete the discount
                    addresses.splice(index, 1);

                    // Update the discounts
                    this._addresses.next(addresses);

                    let isDeleted:boolean = false;
                    if (status === 200) {
                        isDeleted = true
                    }

                    // Return the deleted status
                    return isDeleted;
                })
            ))
        );
    }
    
    getCustomerAddressById(addressId:string) : Observable<Address>
    {
        let userService = this._apiServer.settings.apiServer.userService;
        let accessToken = "accessToken";
        let customerId = this._jwt.getJwtPayload(this._authService.jwtAccessToken).uid;
        
        const header = {
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
   
        };

        let response = this._httpClient.get<Address>(userService + '/customer/' + customerId + '/address/' + addressId, header);
        this._logging.debug("Response from CheckoutService (getAddressById)", response);

        return response;

    }

    getStoreRegionCountryState(regionCountryId: string): Observable<any>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        //let accessToken = this._jwt.getJwtPayload(this.accessToken).act;
        let accessToken = "accessToken";

        const header = {
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
            params: {
                "regionCountryId": regionCountryId
            }
        };

        return this._httpClient.get<any>(productService + '/region-country-state', header)
            .pipe(
                map((response) => {
                    this._logging.debug("Response from StoresService (getStoreRegionCountryState)",response);
                    return response["data"].content;
                })
            );
    }

    getDiscountOfCartGroup(
        CartListBody: any,
        params: { 
            platformVoucherCode : string,
            customerId          : string,
            email?              : string,
        } = {
            platformVoucherCode : null,
            customerId          : null, 
            email               : null, 
        }
        ): Observable<DiscountOfCartGroup> 
    {
        let orderService = this._apiServer.settings.apiServer.orderService;
        //let accessToken = this._jwt.getJwtPayload(this.accessToken).act;
        let accessToken = "accessToken";

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
            params: params

        };

        // Delete empty value
        Object.keys(header.params).forEach(key => {
        if (Array.isArray(header.params[key])) {
            header.params[key] = header.params[key].filter(element => element !== null)
        }
        if (header.params[key] === null || (header.params[key].constructor === Array && header.params[key].length === 0)) {
            delete header.params[key];
        }
        });  

        return this._httpClient.post<any>(orderService + '/carts' + '/groupdiscount', CartListBody, header)
            .pipe(
                map((response) => {
                    this._logging.debug("Response from StoresService (getDiscountOfCartGroup)",response);

                    this._cartSummary.next(response['data']);

                    // Return the new notification from observable
                    return response['data'];
                })
        );
    }
    
    // /**
    //  * Create the cart
    //  *
    //  * @param cart
    //  */
    // createCart(cart: Cart): Observable<any>
    // {
    //     let orderService = this._apiServer.settings.apiServer.orderService;
    //     //let accessToken = this._jwt.getJwtPayload(this.accessToken).act;
    //     let accessToken = "accessToken";

    //     const header = {  
    //         headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`)
    //     };

    //     return this._httpClient.post<any>(orderService + '/carts', cart, header)
    //         .pipe(
    //             map((response) => {
    //                 this._logging.debug("Response from StoresService (createCart)",response);

    //                 // set cart id
    //                 this.cartId = response["data"].id;

    //                 // set cart
    //                 this._cart.next(response);

    //                 return response["data"];
    //             })
    //         );
    // }

    // /**
    //  * Update the cart
    //  *
    //  * @param cart
    //  */
    // updateCart(cart: Cart): Observable<any>
    // {
    //     return this._httpClient.patch<Cart>('api/common/cart', {cart}).pipe(
    //         map((response) => {
    //             this._cart.next(response);
    //         })
    //     );
    // }
}
