import { Inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of, ReplaySubject } from 'rxjs';
import { catchError, map, switchMap, take, tap } from 'rxjs/operators';
import { Cart, CartItem, CartPagination, CartWithDetails, CustomerCart, DiscountOfCartGroup } from 'app/core/cart/cart.types';
import { AppConfig } from 'app/config/service.config';
import { LogService } from 'app/core/logging/log.service';
import { AuthService } from '../auth/auth.service';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { JwtService } from '../jwt/jwt.service';

@Injectable({
    providedIn: 'root'
})
export class CartService
{
    private _cartWithDetails: ReplaySubject<CartWithDetails> = new ReplaySubject<CartWithDetails>(1);
    private _cartsWithDetails: ReplaySubject<CartWithDetails[]> = new ReplaySubject<CartWithDetails[]>(1);
    private _cartsWithDetailsPagination: ReplaySubject<CartPagination> = new ReplaySubject<CartPagination>(1);

    private _cartsHeaderWithDetails: ReplaySubject<CartWithDetails[]> = new ReplaySubject<CartWithDetails[]>(1);
    private _cartsHeaderWithDetailsPagination: ReplaySubject<CartPagination> = new ReplaySubject<CartPagination>(1);

    private _cartSummary: ReplaySubject<DiscountOfCartGroup> = new ReplaySubject<DiscountOfCartGroup>(1);

    /**
     * Constructor
     */
    constructor(
        @Inject(DOCUMENT) private _document: Document,
        private _httpClient: HttpClient,
        private _apiServer: AppConfig,
        private _authService: AuthService,
        private _jwtService: JwtService,
        private _router: Router,
        private _logging: LogService
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /** Getter for cartWithDetails */
    get cartWithDetails$(): Observable<CartWithDetails> { return this._cartWithDetails.asObservable(); }
    /** Getter for cartsWithDetails */
    get cartsWithDetails$(): Observable<CartWithDetails[]> { return this._cartsWithDetails.asObservable(); }
    /** Setter for cartsWithDetails */
    set cartsWithDetails(value: CartWithDetails[]) { this._cartsWithDetails.next(value); }
    /** Getter for cartsWithDetailsPagination */
    get cartsWithDetailsPagination$(): Observable<CartPagination> { return this._cartsWithDetailsPagination.asObservable(); }

    /** Getter for cartsHeaderWithDetails */
    get cartsHeaderWithDetails$(): Observable<CartWithDetails[]> { return this._cartsHeaderWithDetails.asObservable(); }
    /** Setter for cartsWithDetails */
    set cartsHeaderWithDetails(value: CartWithDetails[]) { this._cartsHeaderWithDetails.next(value); }
    /** Getter for cartsHeaderWithDetailsPagination */
    get cartsHeaderWithDetailsPagination$(): Observable<CartPagination> { return this._cartsHeaderWithDetailsPagination.asObservable(); }

    /** Getter for cartId */
    get cartIds$(): string { return localStorage.getItem('cartIds') ?? ''; }
    /** Setter for cartId */
    set cartIds(value: string) { localStorage.setItem('cartIds', value); }

    /** Cart Summary */
    get cartSummary$(): Observable<DiscountOfCartGroup> { return this._cartSummary.asObservable(); }
    /** Setter Cart Summary */
    set cartSummary(value: DiscountOfCartGroup) { this._cartSummary.next(value); }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    cartResolver(resolveCartHeader: boolean = false): Observable<any>
    {
        return of(true).pipe(
            map(()=>{
                
                let customerId = this._jwtService.getJwtPayload(this._authService.jwtAccessToken).uid ? this._jwtService.getJwtPayload(this._authService.jwtAccessToken).uid : null;
                let cartIds: { id: string, storeId: string, cartItems: CartItem[]}[] = this.cartIds$ ? JSON.parse(this.cartIds$) : [];
                

                // if resolveCartHeader true, we'll query 99 (max) paginated pageSize
                // for cart notification header, normal default cartItem is 5
                let pageSize: number = resolveCartHeader ? 99 : 5;
                if (customerId){
                    this.getCartsWithDetails({ page: 0, pageSize: pageSize, customerId: customerId, includeEmptyCart: false}, resolveCartHeader)
                    .subscribe(cart => {                        
                    });
                }
                else if (cartIds && cartIds.length) {
                    this.getCartsWithDetails({ cartIdList: cartIds.map(item => item.id), page: 0, pageSize: pageSize, includeEmptyCart: false}, resolveCartHeader)
                        .subscribe((response: CartWithDetails[])=>{
                            if (response) {
                                this.cartIds = JSON.stringify(response.map(item => {
                                    return {
                                        id: item.id,
                                        cartItems: item.cartItems,
                                        storeId: item.storeId
                                    }
                                }));
                            }
                        });
                }
                else {
                    // Set cart to null
                    this._cartsHeaderWithDetails.next(null);
                    this._cartsWithDetails.next(null);

                }
            })
        );
    }

    // -------------
    // Cart
    // -------------

    /**
     * Get the current logged in cart data
     */
    getCarts(page: number = 0, size: number = 10, storeId: string = null, customerId: string = null):
        Observable<{ pagination: CartPagination; carts: Cart[] }>
    {
        let orderService = this._apiServer.settings.apiServer.orderService;
        //let accessToken = this._jwt.getJwtPayload(this.accessToken).act;
        let accessToken = "accessToken";

        const header = {
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
            params: {
                page        : '' + page,
                pageSize    : '' + size,
                storeId     : '' + storeId,
                customerId  : '' + customerId
            }
        };

        if (storeId === null) delete header.params.storeId;

        return this._httpClient.get<any>(orderService +'/carts', header).pipe(
            tap((response) => {
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
    }, isNotificationCounter: boolean = false):
    Observable<any>
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

        return this._httpClient.get<any>(orderService +'/carts/details', header).pipe(
            map((response) => {

                this._logging.debug("Response from CartService (getCartsHeaderWithDetails) " + (isNotificationCounter ? "Cart Header Notification" : "Cart Items") ,response);

                let _pagination = {
                    length: response.data.totalElements,
                    size: response.data.size,
                    page: response.data.number,
                    lastPage: response.data.totalPages,
                    startIndex: response.data.pageable.offset,
                    endIndex: response.data.pageable.offset + response.data.numberOfElements - 1
                }
                if (isNotificationCounter) {
                    this._cartsHeaderWithDetailsPagination.next(_pagination);
                    this._cartsHeaderWithDetails.next(response.data.content);
                } else {
                    this._cartsWithDetailsPagination.next(_pagination);
                    this._cartsWithDetails.next(response.data.content);
                }

                return response["data"].content;
            })
        );
    }
    
    /**
     * (Used by app.resolver)
     * 
     * @param customerId 
     * @returns 
     */
    getCartsByCustomerId(customerId: string): Observable<CustomerCart>
    {
        let orderService = this._apiServer.settings.apiServer.orderService;

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${this._authService.publicToken}`),
            params: {
                customerId
            }
        };

        return this._httpClient.get<any>(orderService + '/carts/customer', header)
            .pipe(
                catchError(() =>
                    // Return false
                    of(false)
                ),
                switchMap(async (response: any) => {
                    this._logging.debug("Response from CartService (getCartsByCustomerId)", response);
                    return response["data"];
                })
            );
    }
    
    /**
     * Create the cart
     *
     * @param cart
     */
    createCart(cart: Cart): Observable<any>
    {
        let orderService = this._apiServer.settings.apiServer.orderService;
        //let accessToken = this._jwt.getJwtPayload(this.accessToken).act;
        let accessToken = "accessToken";

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`)
        };

        return this._httpClient.post<any>(orderService + '/carts', cart, header)
            .pipe(
                catchError(() =>
                    // Return false
                    of(false)
                ),
                switchMap(async (response: any) => {
                    this._logging.debug("Response from StoresService (createCart)",response);

                    return response["data"];
                })
            );
    }

    /**
     * Update the cart
     *
     * @param cart
     */
    updateCart(cart: Cart): Observable<any>
    {
        return this._httpClient.patch<Cart>('api/common/cart', {cart}).pipe(
            tap((response) => {

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

        return this._httpClient.delete<any>(orderService + '/carts/' + cartId, header)
            .pipe(
                tap((response) => {
                    this._logging.debug("Response from CartService (deleteCart)", response);

                })
            );
    }

    mergeCart(customerCartId : string, guestCartId : string):  Observable<Cart>
    {
        let orderService = this._apiServer.settings.apiServer.orderService;
        //let accessToken = this._jwt.getJwtPayload(this.accessToken).act;
        let accessToken = "accessToken";

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`)
        };

        return this._httpClient.put<any>(orderService + '/carts/' + customerCartId + '/' + guestCartId, header)
            .pipe(
                take(1),
                catchError(() =>
                    // Return false
                    of(false)
                ),
                switchMap(async (response: any) => {
                                
                    this._logging.debug("Response from CartService (mergeCart)", response);
                
                    return response;
                })
            );

    }

    mergeMultipleCarts(customerId : string, guestCartIdList : string[]):  Observable<Cart>
    {
        let orderService = this._apiServer.settings.apiServer.orderService;
        //let accessToken = this._jwt.getJwtPayload(this.accessToken).act;
        let accessToken = "accessToken";

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`)
        };

        return this._httpClient.put<any>(orderService + '/carts/merge/' + customerId, guestCartIdList, header)
            .pipe(
                take(1),
                catchError(() =>
                    // Return false
                    of(false)
                ),
                switchMap(async (response: any) => {
                                
                    this._logging.debug("Response from CartService (mergeMultipleCarts)", response);
                
                    return response;
                })
            );

    }

    // -------------
    // Cart Items
    // -------------

    /**
     * Get the current logged in cart data
     */
    getCartItems(id: string): Observable<Cart>
    {
        let orderService = this._apiServer.settings.apiServer.orderService;
        //let accessToken = this._jwt.getJwtPayload(this.accessToken).act;
        let accessToken = "accessToken";

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`)
        };

        return this._httpClient.get<any>(orderService + '/carts/' + id + '/items', header)
            .pipe(
                tap((response) => {
                    this._logging.debug("Response from StoresService (getCartItems)",response);

                })
            );
    }

    postCartItem(cartId: string, cartItem: CartItem):  Observable<CartItem>
    {        
        let orderService = this._apiServer.settings.apiServer.orderService;
        //let accessToken = this._jwt.getJwtPayload(this.accessToken).act;
        let accessToken = "accessToken";

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`)
        };

        return this._httpClient.post<any>(orderService + '/carts/' + cartId + '/items', cartItem, header)
            .pipe(
                map((response) => {
                    this._logging.debug("Response from StoresService (postCartItem)",response);

                    return response["data"];
                })
            );
    }

    putCartItem(cartId: string, cartItem: CartItem, itemId: string):  Observable<CartItem>
    {
        let orderService = this._apiServer.settings.apiServer.orderService;
        //let accessToken = this._jwt.getJwtPayload(this.accessToken).act;
        let accessToken = "accessToken";

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`)
        };
        

        return this.cartsWithDetails$.pipe(
            take(1),
            switchMap(cartsWithDetails => this._httpClient.put<any>(orderService + '/carts/' + cartId + '/items/' + itemId, cartItem, header)
            .pipe(
                map((response) => {
                    this._logging.debug("Response from StoresService (updateCartItem)",response);

                    let cartIndex = cartsWithDetails.findIndex(item => item.id === response["data"].cartId);
                    let cartItemIndex = cartIndex > -1 ? cartsWithDetails[cartIndex].cartItems.findIndex(item => item.id === response["data"].id) : -1;

                    if (cartItemIndex > -1) { 

                        let _cart = cartsWithDetails[cartIndex];
                        _cart.cartItems[cartItemIndex] = response["data"];

                        // update if existing cart item id exists
                        cartsWithDetails[cartIndex] = { ...cartsWithDetails[cartIndex], ..._cart};
                        this._cartsWithDetails.next(cartsWithDetails);
                    } 

                    return response["data"];
                })
            ))
        );
    }

    deleteCartItem(cartId: string, itemId: string, resolveCartHeader: boolean = false):  Observable<CartItem>
    {
        let orderService = this._apiServer.settings.apiServer.orderService;
        //let accessToken = this._jwt.getJwtPayload(this.accessToken).act;
        let accessToken = "accessToken";

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`)
        };        

        return this.cartsWithDetails$.pipe(
            take(1),
            switchMap(cartsWithDetails => this._httpClient.delete<any>(orderService + '/carts/' + cartId + '/items/' + itemId, header)
            .pipe(
                map((response) => {
                    this._logging.debug("Response from CartService (deleteCartItem)",response);

                    let cartIdIndex = cartsWithDetails.findIndex(item => item.id === cartId);
                    let cartItemIdIndex = cartIdIndex > -1 ? cartsWithDetails[cartIdIndex].cartItems.findIndex(item => item.id === itemId) : -1;
                    if (cartItemIdIndex > -1) {
                        // Delete the cartItems
                        cartsWithDetails[cartIdIndex].cartItems.splice(cartItemIdIndex, 1);

                        // Update the products
                        this._cartsWithDetails.next(cartsWithDetails);
                    }

                    return response["message"];
                })
            ))
        );
    }

    /**
     * Merge carts and redirect
     * 
     * @param guestCartId 
     * @param storeId 
     * @param ownerId 
     * @param redirectURL 
     */
    mergeAndRedirect(guestCartId: string, storeId: string, ownerId: string, redirectURL: string = null): void 
    {
        if (guestCartId && storeId) {  

            this.getCarts(0, 20, storeId, ownerId)
                .subscribe(cartResponse => {

                    if (cartResponse['data'].content.length > 0) {
                        
                        let cart = cartResponse['data'].content[0];

                        if (guestCartId != cart.id) {
                            // merge carts
                            this.mergeCart(cart.id, guestCartId)
                                .subscribe(mergeResponse => {
                                    this.redirect(redirectURL);
                                })
                        }
                        // guest cartId and existing cartId is the same
                        else {
                            this.redirect(redirectURL);
                        }
                    }
                    // if no existing cart for the store, then create one, then merge it
                    else {
                        const createCartBody = {
                            customerId: ownerId, 
                            storeId: storeId,
                        }
                        this.createCart(createCartBody)
                            .subscribe((cart: Cart)=>{
                                // set cart id
                                let cartId = cart.id;
                                // merge carts
                                this.mergeCart(cartId, guestCartId)
                                .subscribe(mergeResponse => {
                                    this.redirect(redirectURL);
                                })
                            });
                    }
                })
        } 
        // if no guestCartId/storeId
        else {
            this.redirect(redirectURL);
        }    

    }

    /**
     * Redirect to external/internal URL
     * 
     * @param redirectURL 
     */
    redirect(redirectURL?: string) {

        // store front domain, to be used to compare with redirectURL
        const storeFrontDomain = this._apiServer.settings.storeFrontDomain;
        // const redirectURL = this._activatedRoute.snapshot.queryParamMap.get('redirectURL')
        
        if (redirectURL) {  
            
            if (redirectURL.includes(storeFrontDomain)) {
                // Navigate to the external redirect url
                this._document.location.href = redirectURL;
            } else {
                // Navigate to the internal redirect url
                this._router.navigateByUrl(redirectURL);
            }
        }
        else 
        {
            this._router.navigateByUrl('/signed-in-redirect');
        }
    }

    //-----------------------
    //      Cart Group
    //-----------------------

    getDiscountOfCartGroup(CartListBody: any, 
        params: { 
        platformVoucherCode : string,
        customerId          : string,
        email?              : string,
        } = {
            platformVoucherCode : null,
            customerId          : null, 
            email               : null, 
        },
        isGlobal: boolean = false
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

                    // Set the observable only for isGlobal false
                    if (isGlobal === false) 
                        this._cartSummary.next(response['data']);

                    // Return the new notification from observable
                    return response['data'];
                })
        );
    }

}
