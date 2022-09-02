import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of, ReplaySubject, Subject, throwError } from 'rxjs';
import { switchMap, take, map, tap, catchError, filter } from 'rxjs/operators';
import { Store, StoreRegionCountry, StoreTiming, StorePagination, StoreAssets, CreateStore, StoreDeliveryDetails, StoreSelfDeliveryStateCharges, StoreDeliveryProvider, StoreCategory, StoreDiscount, StoreSnooze, City } from 'app/core/store/store.types';
import { AppConfig } from 'app/config/service.config';
import { takeUntil } from 'rxjs/operators';
import { LogService } from 'app/core/logging/log.service';
import { FormControl } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { DisplayErrorService } from '../display-error/display-error.service';
import { ProductsService } from '../product/product.service';

@Injectable({
    providedIn: 'root'
})
export class StoresService
{
    // for all store
    private _store: BehaviorSubject<Store | null> = new BehaviorSubject(null);
    private _stores: BehaviorSubject<Store[] | null> = new BehaviorSubject(null);
    private _pagination: BehaviorSubject<StorePagination | null> = new BehaviorSubject(null);

    // // for featured store display
    // private _featuredStore: BehaviorSubject<Store | null> = new BehaviorSubject(null);
    // private _featuredStores: BehaviorSubject<Store[] | null> = new BehaviorSubject(null);
    // private _featuredStorePagination: BehaviorSubject<StorePagination | null> = new BehaviorSubject(null);

    private _storeCategory: BehaviorSubject<StoreCategory | null> = new BehaviorSubject(null);
    private _storeCategories: BehaviorSubject<StoreCategory[] | null> = new BehaviorSubject(null);

    private _storeDiscount: BehaviorSubject<StoreDiscount | null> = new BehaviorSubject(null);
    private _storeDiscounts: BehaviorSubject<StoreDiscount[] | null> = new BehaviorSubject(null);
    
    private _storeSnooze: BehaviorSubject<StoreSnooze | null> = new BehaviorSubject(null);
    private _storeRegionCountries: ReplaySubject<StoreRegionCountry[]> = new ReplaySubject<StoreRegionCountry[]>(1);
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private _currentStores: Store[] = [];

    public storeControl: FormControl = new FormControl();
    public storeCategoryControl: FormControl = new FormControl();

    private _city: BehaviorSubject<City | null> = new BehaviorSubject(null);
    private _cities: BehaviorSubject<City[] | null> = new BehaviorSubject(null);

    /**
     * Constructor
     */
    constructor(
        private _httpClient: HttpClient,
        private _apiServer: AppConfig,
        private _authService: AuthService,
        private _productsService: ProductsService,
        private _displayErrorService: DisplayErrorService,
        private _logging: LogService
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    resolveStore(storeDomain: string): Observable<any>
    {
        let storeFrontUrl = this._apiServer.settings.storeFrontDomain;
        return this.getStoreByDomainName(storeDomain + storeFrontUrl)
                .pipe(
                    map((response: Store) => {
                        if (response) {
                            this.storeId = response.id;
                            this.getStoreCategories(response.id).subscribe();
                            this._productsService.getProducts(0, 8, "name", "asc", '', 'ACTIVE,OUTOFSTOCK', '').subscribe();
                        } else {
                            this._displayErrorService.show({title: "Store Not Found", type: '4xx', message: "The store you are looking for might have been removed, had its name changed or is temporarily unavailable.", code: "404"});
                        }
                        return response;
                    })
                )
    }

    // ----------------------
    //         Store
    //-----------------------

    /**
     * Getter for store
     *
    */
    get store$(): Observable<Store>
    {
        return this._store.asObservable();
    }

    /**
     * Setter for stores
     *
     * @param value
     */
    set store(value: Store)
    {
        // Store the value
        this._store.next(value);
    }

    /**
    * Getter for stores
    *
    */
    get stores$(): Observable<Store[]>
    {
        return this._stores.asObservable();
    }
    
    /**
    * Setter for stores
    *
    * @param value
    */
    set stores(value: Store[])
    {
        // Store the value
        this._stores.next(value);
    }

    /**
    * Getter for stores pagination
    */
    get pagination$(): Observable<StorePagination>
    {
        return this._pagination.asObservable();
    }

    // ----------------------
    //         Category
    //----------------------- 

    /**
     * Getter for store Categories
     *
    */
    get storeCategories$(): Observable<StoreCategory[]>
    {
        return this._storeCategories.asObservable();
    }
    
    /**
     * Setter for store Categories
     *
     * @param value
     */
    set storeCategories(value: StoreCategory[])
    {
        // Store the value
        this._storeCategories.next(value);
    }

    /**
     * Getter for store Category
     *
    */
    get storeCategory$(): Observable<StoreCategory>
    {
        return this._storeCategory.asObservable();
    }
    
    /**
     * Setter for store Category
     *
     * @param value
     */
    set storeCategory(value: StoreCategory)
    {
        // Store the value
        this._storeCategory.next(value);
    }

    /**
     * Getter for store Discounts
     *
    */
    get storeDiscounts$(): Observable<StoreDiscount[]>
    {
        return this._storeDiscounts.asObservable();
    }
    
    /**
     * Setter for store Discounts
     *
     * @param value
     */
    set storeDiscounts(value: StoreDiscount[])
    {
        // Store the value
        this._storeDiscounts.next(value);
    }

    /**
     * Getter for store Discount
     *
     */
    get storeDiscount$(): Observable<StoreDiscount>
    {
        return this._storeDiscount.asObservable();
    }
    
    /**
     * Setter for store Discount
     *
     * @param value
     */
    set storeDiscount(value: StoreDiscount)
    {
        // Store the value
        this._storeDiscount.next(value);
    }

    /**
     * Getter for store Discount
     *
     */
    get storeSnooze$(): Observable<StoreSnooze>
    {
        return this._storeSnooze.asObservable();
    }
    
    /**
     * Setter for store Discount
     *
     * @param value
     */
    set storeSnooze(value: StoreSnooze)
    {
        // Store the value
        this._storeSnooze.next(value);
    }
 
    /**
     * Getter for store region countries
     *
     */

    get storeRegionCountries$(): Observable<StoreRegionCountry[]>
    {
        return this._storeRegionCountries.asObservable();
    }

    /**
     * Setter for storeId
     */
    set storeId(str: string)
    {
        localStorage.setItem('storeId', str);
    }

    /**
     * Getter for storeId
     */

    get storeId$(): string
    {
        return localStorage.getItem('storeId') ?? '';
    }

    /**
    * Getter for city
    *
    */
    get city$(): Observable<City>
    {
        return this._city.asObservable();
    }
    
    /**
     * Setter for city
     *
     * @param value
     */
    set city(value: City)
    {
        // Store the value
        this._city.next(value);
    }
    
    /**
     * Getter for city
     *
     */
    get cities$(): Observable<City[]>
    {
        return this._cities.asObservable();
    }
        
    /**
     * Setter for city
     *
     * @param value
     */
    set cities(value: City[])
    {
        // Store the value
        this._cities.next(value);
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------


    // ---------------------------
    // Store Section
    // ---------------------------

    /**
     * Get the current logged in store data
     * 
     * @param id 
     * @param page 
     * @param size 
     * @param regionCountryId 
     * @param sort 
     * @param order 
     * @param search 
     * @param category 
     * @returns 
     */
    getStores(id: string = "", page: number = 0, size: number = 10, regionCountryId: string = "" , sort: string = 'name', order: 'asc' | 'desc' | '' = 'asc', search: string = '', category: string = ''): 
        Observable<{ pagination: StorePagination; stores: Store[] }>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        let accessToken = this._authService.publicToken;
        // let clientId = this._jwt.getJwtPayload(this._authService.jwtAccessToken).uid;

        if(search === null) {
            search = ""
        }

        const header = {
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
            params: {
                // clientId: clientId,
                page: '' + page,
                pageSize: '' + size,
                regionCountryId: '' + regionCountryId,
                sortByCol: '' + sort,
                sortingOrder: '' + order.toUpperCase(),
                name: '' + search
            }
        };

        if (category !== "") {
            header.params["verticalCode"] = category;
        }

        // if ada id change url stucture
        if (id !== "") { id = "/" + id } 
        
        return this._httpClient.get<{ pagination: StorePagination; stores: Store[] }>(productService + '/stores' + id, header)
        .pipe(
            tap((response) => {
                
                this._logging.debug("Response from StoresService (getStores)",response);

                // Pagination
                let _pagination = {
                    length: response["data"].totalElements,
                    size: response["data"].size,
                    page: response["data"].number,
                    lastPage: response["data"].totalPages,
                    startIndex: response["data"].pageable.offset,
                    endIndex: response["data"].pageable.offset + response["data"].numberOfElements - 1
                }
                
                // this is local
                this._currentStores = response["data"].content;
                
                (this._currentStores).forEach(async (item, index) => {
                    // let assets = await this.getStoreAssets(item.id);
                    // this._currentStores[index] = Object.assign(this._currentStores[index],{storeLogo: "" });
                    this._currentStores[index] = Object.assign(this._currentStores[index],{slug: item.name.toLowerCase().replace(/ /g, '-').replace(/[-]+/g, '-').replace(/[^\w-]+/g, '')});
                    this._currentStores[index] = Object.assign(this._currentStores[index],{duration: 30});
                    this._currentStores[index] = Object.assign(this._currentStores[index],{totalSteps: 3});
                    this._currentStores[index] = Object.assign(this._currentStores[index],{featured: true});
                    this._currentStores[index] = Object.assign(this._currentStores[index],{progress: { completed: 2, currentStep: 2  }});
                    this._currentStores[index] = Object.assign(this._currentStores[index],{category: item.type});
                    this._currentStores[index] = Object.assign(this._currentStores[index],{completed: 2});
                    this._currentStores[index] = Object.assign(this._currentStores[index],{currentStep: 3});
                    // this._currentStores[index]["storeLogo"] = (assets && assets !== null) ? assets["logoUrl"] : "";
                });

                // this is observable service

                this._pagination.next(_pagination);
                this._stores.next(this._currentStores);
            })
        );
    }

    getStoresById(id: string): Observable<Store>
    {
        return this._stores.pipe(
            take(1),
            map((stores) => {

                // Find the store
                const store = stores.find(item => item.id === id) || null;

                this._logging.debug("Response from StoresService (getStoresById)",store);

                // Update the store
                this._store.next(store);

                // Return the store
                return store;
            }),
            switchMap((store) => {

                if ( !store )
                {
                    return throwError('(getStoresById) Could not found store with id of ' + id + '!');
                }

                return of(store);
            })
        );
    }

    getStoreById(id: string): Observable<Store>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        // let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
        let accessToken = "accessToken";
        // let clientId = this._jwt.getJwtPayload(this._authService.jwtAccessToken).uid;

        const header = {
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
        };
        
        return this._httpClient.get<Store>(productService + '/stores/' + id , header)
        .pipe(
            map((response) => {
                this._logging.debug("Response from StoresService (getStoreById)",response);
                this._store.next(response["data"]);

                // set this
                this.storeControl.setValue(response["data"]);

                return response["data"];
            })
        )
    }

    getStoreByDomainName(domainName: string): Observable<Store>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
        let accessToken = "accessToken";

        const header = {
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
            params: {
                "domain": domainName
            }
        };

        return this.store$.pipe(
            take(1),
            // switchMap(products => this._httpClient.post<InventoryProduct>('api/apps/ecommerce/inventory/product', {}).pipe(
            switchMap(store => this._httpClient.get<Store>(productService + '/stores', header).pipe(
                map((response) => {

                    this._logging.debug("Response from StoresService (getStoreByDomainName)", response);

                    const store = response["data"].content.length > 0 ? response["data"].content[0] : null;

                    // Update the store
                    this._store.next(store);

                    // Update local storage
                    this.storeId = store !== null ? store.id : '';
    
                    // Return the store
                    return store;
                })
            ))
        );
    }

    getStoreTop(countryCode:string): Observable<any>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        let accessToken = this._authService.publicToken;

        const header = {
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
            params: {
                countryId: countryCode,
            }
        };

        return this._httpClient.get<any>(productService + '/stores/top', header).pipe(
            map((response) => {
                this._logging.debug("Response from StoresService (getStoreTop)",response);

                return response.data;
            })
        );
    }

    // post(storeBody: CreateStore): Observable<any>
    // {
    //     let productService = this._apiServer.settings.apiServer.productService;
    //     //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
    //     let accessToken = "accessToken";
    //     let clientId = this._jwt.getJwtPayload(this._authService.jwtAccessToken).uid;

    //     const header = {
    //         headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
    //         params: {
    //             "clientId": clientId
    //         }
    //     };
        
    //     return this.store$.pipe(
    //         take(1),
    //         // switchMap(products => this._httpClient.post<InventoryProduct>('api/apps/ecommerce/inventory/product', {}).pipe(
    //         switchMap(stores => this._httpClient.post<Store>(productService + '/stores', storeBody , header).pipe(
    //             map((response) => {

    //                 this._logging.debug("Response from StoresService (Create Store)",response);

    //                 // Return the new product
    //                 return response;
    //             })
    //         ))
    //     );
    // }

    /**
     * Update the store
     *
     * @param store
     */
    // update(storeId: string, storeBody: Store): Observable<Store>
    // {
    //     let productService = this._apiServer.settings.apiServer.productService;
    //     //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
    //     let accessToken = "accessToken";
    //     let clientId = this._jwt.getJwtPayload(this._authService.jwtAccessToken).uid;

    //     const header = {
    //         headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
    //         params: {
    //             "clientId": clientId
    //         }
    //     };
        
    //     return this.stores$.pipe(
    //         take(1),
    //         // switchMap(products => this._httpClient.post<InventoryProduct>('api/apps/ecommerce/inventory/product', {}).pipe(
    //         switchMap(stores => this._httpClient.put<Store>(productService + '/stores/' + storeId , storeBody , header).pipe(
    //             map((response) => {

    //                 this._logging.debug("Response from StoresService (Edit Store)",response);

    //                 // Find the index of the updated product
    //                 const index = stores.findIndex(item => item.id === storeId);

    //                 // Update the product
    //                 stores[index] = { ...stores[index], ...response["data"]};

    //                 // Update the products
    //                 this._stores.next(stores);

    //                 // Return the new product
    //                 return response["data"];
    //             }),
    //             switchMap(response => this.store$.pipe(
    //                 take(1),
    //                 filter(item => item && item.id === storeId),
    //                 tap(() => {

    //                     // Update the product if it's selected
    //                     this._store.next(response);

    //                     // Return the updated product
    //                     return response;
    //                 })
    //             ))
    //         ))
            
    //     );
    // }

    /**
     * Delete the store
     * 
     * @param storeId
     */

    // delete(storeId: string): Observable<any>
    // {
    //     let productService = this._apiServer.settings.apiServer.productService;
    //     //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
    //     let accessToken = "accessToken";
    //     let clientId = this._jwt.getJwtPayload(this._authService.jwtAccessToken).uid;

    //     const header = {
    //         headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
    //         params: {
    //             "clientId": clientId
    //         }
    //     };
        
    //     return this.stores$.pipe(
    //         take(1),
    //         switchMap(stores => this._httpClient.delete(productService +'/stores/' + storeId, header).pipe(
    //             map((response) => {

    //                 this._logging.debug("Response from StoresService (Delete Store)",response);

    //                 // Find the index of the deleted product
    //                 const index = stores.findIndex(item => item.id === storeId);

    //                 // Delete the product
    //                 stores.splice(index, 1);

    //                 // Update the products
    //                 this._stores.next(stores);

    //                 let isDeleted:boolean = false;
    //                 if (response["status"] === 200) {
    //                     isDeleted = true
    //                 }

    //                 // Return the deleted status
    //                 return isDeleted;
    //             })
    //         ))
    //     );
    // }

    setFirstStoreId(){
        this.stores$
            .pipe((takeUntil(this._unsubscribeAll)))
            .subscribe((storeList: Store[]) => {
                this.storeId = storeList[0].id;
            });  
    }

    // ---------------------------
    // Store Categories Section
    // ---------------------------

    getStoreCategories(storeId: string = "", name: string="", page: number = 0, size: number = 30, sort: string = 'name', order: 'asc' | 'desc' | '' = 'asc'): Observable<any>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
        let accessToken = "accessToken";

        const header = {
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
            params: {
                name        : '' + name,
                // storeId     : this.storeId$,
                storeId     : '' + storeId,
                page        : '' + page,
                pageSize    : '' + size,
                sortByCol   : '' + sort,
                sortingOrder: '' + order.toUpperCase(),
            }
        };

        return this._httpClient.get<any>(productService + '/store-categories', header)
            .pipe(
                tap((response) => {
                    this._logging.debug("Response from StoresService (getStoreCategories)",response);

                    this._storeCategories.next(response["data"].content);

                    return response["data"].content;
                })
            );
    }

    getStoreCategoriesById(id: string): Observable<StoreCategory>
    {
        return this._storeCategories.pipe(
            take(1),
            map((storeCategries) => {

                if (storeCategries) {

                    // Find the storeCategory 
                    const storeCategory = storeCategries.find(item => item.id === id) || null;
                    // set this
                    this.storeControl.setValue(storeCategory);
    
                    this._logging.debug("Response from StoresService (getStoreCategoriesById)", storeCategory);
    
                    // Update the storeCategory
                    this._storeCategory.next(storeCategory);
                    this.storeCategoryControl.setValue(storeCategory);
    
                    // Return the store
                    return storeCategory;
                }
            }),
            switchMap((storeCategory) => {

                if ( !storeCategory )
                {
                    return throwError('(getStoreCategoriesById) Could not found store with id of ' + id + '!');
                }

                return of(storeCategory);
            })
        );
    }

    // ---------------------------
    // Store Discount Section
    // ---------------------------

    getStoreDiscounts(): Observable<any>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
        let accessToken = "accessToken";

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
        };

        return this._httpClient.get<any>(productService + '/stores/' + this.storeId$ + '/discount/active', header)
            .pipe(
                tap((response) => {
                    this._logging.debug("Response from StoresService (getStoreDiscounts)",response);

                    this._storeDiscounts.next(response["data"]);

                    return response["data"];
                })
            );
    }

    // ---------------------------
    // Store Region Countries Section
    // ---------------------------

    getStoreRegionCountries(): Observable<any>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
        let accessToken = "accessToken";

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
        };

        return this._httpClient.get<any>(productService + '/region-countries', header)
            .pipe(
                tap((response) => {
                    this._logging.debug("Response from StoresService (getStoreRegionCountries)",response);
                    return this._storeRegionCountries.next(response["data"].content);
                })
            );
    }

    getStoreRegionCountriesById(countryId: string): Observable<any>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
        let accessToken = "accessToken";

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
        };

        return this._httpClient.get<any>(productService + '/region-countries/' + countryId, header)
            .pipe(
                map((response) => {
                    this._logging.debug("Response from StoresService (getStoreRegionCountriesById)", response);
                    return response["data"];
                })
            );
    }

    getStoreRegionCountryState(regionCountryId: string): Observable<any>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
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

    getStoreRegionCountryStateCity(
    params: {
        stateId     : string,
        cityId?     : string, 
        city?       : string
    } = {
        stateId     : null, 
        cityId      : null, 
        city        : null
    }, isResolved: boolean = true): Observable<any>
    {
        let productService = this._apiServer.settings.apiServer.productService;
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

        return this.cities$.pipe(
            take(1),
            switchMap(cities => this._httpClient.get<any>(productService + '/region-country-state-city', header).pipe(
                map((response) => {
                    this._logging.debug("Response from StoresService (getStoreRegionCountryStateCity)",response);

                    // ---------------
                    // Update Store
                    // ---------------
                    if (isResolved) {
                        this._cities.next(response.data);
                    }

                    return response.data;
                })
            ))
        );    
    }

    // ---------------------------
    // Store Timing Section
    // ---------------------------

    postTiming(storeId: string, storeTiming: StoreTiming): Observable<any>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
        let accessToken = "accessToken";

        const header = {
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
        };

        return this._httpClient.post<any>(productService + '/stores/' + storeId + '/timings', storeTiming , header ).pipe(
            map((response) => {
                this._logging.debug("Response from StoresService (postTiming)",response);
            })
        );
    }

    putTiming(storeId: string, day: string ,storeTiming: StoreTiming): Observable<any>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
        let accessToken = "accessToken";

        const header = {
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
        };

        return this._httpClient.put<any>(productService + '/stores/' + storeId + '/timings/' + day, storeTiming , header ).pipe(
            map((response) => {
                this._logging.debug("Response from StoresService (putTiming)",response);
            })
        );
    }

    getStoreSnooze(storeId: string = null) : Observable<any>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
        let accessToken = "accessToken";

        const header = {
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
        };

        return this._httpClient.get<any>(productService + '/stores/' + storeId + '/timings/snooze', header)
            .pipe(
                map((response) => {
                    this._logging.debug("Response from StoresService (getStoreSnooze)",response);

                    this._storeSnooze.next(response["data"]);
                    return response["data"];
                })
            );
    }

    // ---------------------------
    // Store Assets Section
    // ---------------------------

    async getStoreAssets(storeId: string)
    {
        let productService = this._apiServer.settings.apiServer.productService;
        //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
        let accessToken = "accessToken";

        const header = {
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`)
        };

        let response = await this._httpClient.get<any>(productService + '/stores/' + storeId + '/assets', header).toPromise();

        let index = this._currentStores.findIndex(item => item.id === storeId);

        let storeName: string = (index < 0) ? "undefined" : this._currentStores[index].name;

        this._logging.debug("Response from StoresService (getStoreAssets) (store: " + storeName + ")",response);
        return response.data;
    }

    postAssets(storeId: string, storeAssets): Observable<any>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
        let accessToken = "accessToken";

        const header = {
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
        };

        return this._httpClient.post<any>(productService + '/stores/' + storeId + '/assets', storeAssets , header ).pipe(
            map((response) => {
                this._logging.debug("Response from StoresService (postAssets)",response);
            })
        );
    }

    deleteAssetsBanner(storeId: string): Observable<any>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
        let accessToken = "accessToken";

        const header = {
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
        };

        return this._httpClient.delete<any>(productService + '/stores/' + storeId + '/assets/banner' , header ).pipe(
            map((response) => {
                this._logging.debug("Response from StoresService (deleteAssetsBanner)",response);
            })
        );
    }

    deleteAssetsLogo(storeId: string): Observable<any>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
        let accessToken = "accessToken";

        const header = {
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
        };

        return this._httpClient.delete<any>(productService + '/stores/' + storeId + '/assets/logo' , header ).pipe(
            map((response) => {
                this._logging.debug("Response from StoresService (deleteAssetsLogo)",response);
            })
        );
    }

    // ---------------------------
    // Store Delivery Provider Section
    // ---------------------------

    getStoreDeliveryProvider(query: StoreDeliveryProvider): Observable<StoreDeliveryProvider[]>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
        let accessToken = "accessToken";

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
            params: {
                deliveryType: query ? query.deliveryType : null,
                regionCountryId: query.regionCountryId
            }
        };

        // if query exist
        if (!query.deliveryType)
            delete header.params.deliveryType;

        return this._httpClient.get<any>(productService + '/deliveryProvider', header)
            .pipe(
                map((response) => {
                    this._logging.debug("Response from StoresService (getStoreDeliveryProvider)",response);
                    return response.data;
                })
            );
    }

    // ------------------------------------------------------
    // Store Region Country Delivery Service Provider Section
    // ------------------------------------------------------

    getStoreRegionCountryDeliveryProvider(storeId: string, deliveryServiceProviderId: string = ""): Observable<any>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
        let accessToken = "accessToken";

        const header = {
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
            params: {
                deliverySpId: deliveryServiceProviderId,
                storeId: storeId
            }
        };

        if (deliveryServiceProviderId === "") {
            delete header.params.deliverySpId;
        }

        return this._httpClient.get<any>(productService + '/stores/' + storeId + '/deliveryServiceProvider', header).pipe(
            map((response) => {
                this._logging.debug("Response from StoresService (getStoreRegionCountryDeliveryProvider)",response);

                return response.data.content;
            })
        );
    }

    postStoreRegionCountryDeliveryProvider(storeId: string, deliveryServiceProviderId: string): Observable<any>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
        let accessToken = "accessToken";

        const header = {
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
        };

        return this._httpClient.post<any>(productService + '/stores/' + storeId + '/deliveryServiceProvider/' + deliveryServiceProviderId , header).pipe(
            map((response) => {
                this._logging.debug("Response from StoresService (postStoreRegionCountryDeliveryProvider)",response);
            })
        );
    }

    // ---------------------------
    // Store Delivery Details Section
    // ---------------------------

    getStoreDeliveryDetails(storeId: string): Observable<StoreDeliveryDetails>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
        let accessToken = "accessToken";

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`)
        };

        return this._httpClient.get<any>(productService + '/stores/' + storeId + '/deliverydetails', header)
            .pipe(
                map((response) => {
                    this._logging.debug("Response from StoresService (getStoreDeliveryDetails)",response);
                    return response.data;
                })
            );
    }

    postStoreDeliveryDetails(storeId: string, storeDelivery: StoreDeliveryDetails): Observable<any>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
        let accessToken = "accessToken";

        const header = {
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
        };

        return this._httpClient.post<any>(productService + '/stores/' + storeId + '/deliverydetails', storeDelivery , header ).pipe(
            map((response) => {
                this._logging.debug("Response from StoresService (postStoreDeliveryDetails)",response);
            })
        );
    }

    putStoreDeliveryDetails(storeId: string, storeDelivery: StoreDeliveryDetails): Observable<any>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
        let accessToken = "accessToken";

        const header = {
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
        };

        return this._httpClient.put<any>(productService + '/stores/' + storeId + '/deliverydetails', storeDelivery , header ).pipe(
            map((response) => {
                this._logging.debug("Response from StoresService (putStoreDeliveryDetails)",response);
            })
        );
    }
    
    // ---------------------------
    // Store Delivery Charges by States Section
    // ---------------------------

    getSelfDeliveryStateCharges(storeId: string): Observable<StoreSelfDeliveryStateCharges[]>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
        let accessToken = "accessToken";

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
        };

        return this._httpClient.get<any>(productService + '/stores/' + storeId + '/stateDeliveryCharge', header)
            .pipe(
                map((response) => {
                    this._logging.debug("Response from StoresService (getSelfDeliveryStateCharges)",response);
                    return response.data;
                })
            );
    }

    postSelfDeliveryStateCharges(storeId: string, stateDeliveryCharge: StoreSelfDeliveryStateCharges): Observable<any>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
        let accessToken = "accessToken";

        const header = {
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
        };

        return this._httpClient.post<any>(productService + '/stores/' + storeId + '/stateDeliveryCharge', stateDeliveryCharge , header ).pipe(
            map((response) => {
                this._logging.debug("Response from StoresService (postSelfDeliveryStateCharges)",response);
                return response.data;
            })
        );
    }

    putSelfDeliveryStateCharges(storeId: string, stateDeliveryId: string, stateDeliveryCharge: StoreSelfDeliveryStateCharges): Observable<any>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
        let accessToken = "accessToken";

        const header = {
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
        };

        return this._httpClient.put<any>(productService + '/stores/' + storeId + '/stateDeliveryCharge/' + stateDeliveryId, stateDeliveryCharge , header ).pipe(
            map((response) => {
                this._logging.debug("Response from StoresService (putSelfDeliveryStateCharges)",response);
                return response.data;
            })
        );
    }

    deleteSelfDeliveryStateCharges(storeId: string, stateDeliveryId: string): Observable<any>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
        let accessToken = "accessToken";

        const header = {
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
        };

        return this._httpClient.delete<any>(productService + '/stores/' + storeId + '/stateDeliveryCharge/' + stateDeliveryId, header ).pipe(
            map((response) => {
                this._logging.debug("Response from StoresService (deleteSelfDeliveryStateCharges)",response);
                return response.data;
            })
        );
    }

    // ---------------------------
    // Others Section
    // ---------------------------

    async getExistingName(name:string){
        let productService = this._apiServer.settings.apiServer.productService;
        //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
        let accessToken = "accessToken";

        const header = {
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
            params:{
                storeName: name
            }
        };

        let response = await this._httpClient.get<any>(productService + '/stores/checkname', header)
                            .pipe<any>(catchError((error:HttpErrorResponse)=>{
                                    return of(error);
                                })
                            )
                            .toPromise();
    

        this._logging.debug("Response from StoresService (getExistingName) ",response);
        
        //if exist status = 409, if not exist status = 200
        return response.status;

    }

    async getExistingURL(url: string){
        let productService = this._apiServer.settings.apiServer.productService;
        //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
        let accessToken = "accessToken";

        const header = {
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
            params: {
                domain: url
            }
        };

        let response = await this._httpClient.get<any>(productService + '/stores/checkdomain', header)
                                .pipe(catchError((err: HttpErrorResponse) => {
                                    return of(err);
                                }))
                                .toPromise();

        this._logging.debug("Response from StoresService (getExistingURL)",response);

        // if exists status = 409, if not exists status = 200
        return response.status;
    }
}
