import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of, ReplaySubject, Subject, throwError } from 'rxjs';
import { switchMap, take, map, tap, catchError } from 'rxjs/operators';
import { Store, StoreRegionCountry, StoreTiming, StorePagination, StoreDeliveryDetails, StoreSelfDeliveryStateCharges, StoreDeliveryProvider, StoreCategory, StoreDiscount, StoreSnooze, City } from 'app/core/store/store.types';
import { AppConfig } from 'app/config/service.config';
import { LogService } from 'app/core/logging/log.service';
import { AuthService } from '../auth/auth.service';

@Injectable({
    providedIn: 'root'
})
export class StoresService
{
    // for all store
    private _store: BehaviorSubject<Store | null> = new BehaviorSubject(null);
    private _stores: BehaviorSubject<Store[] | null> = new BehaviorSubject(null);
    private _storesPagination: BehaviorSubject<StorePagination | null> = new BehaviorSubject(null);

    private _storeCategory: BehaviorSubject<StoreCategory | null> = new BehaviorSubject(null);
    private _storeCategories: BehaviorSubject<StoreCategory[] | null> = new BehaviorSubject(null);

    private _storeDiscount: BehaviorSubject<StoreDiscount | null> = new BehaviorSubject(null);
    private _storeDiscounts: BehaviorSubject<StoreDiscount[] | null> = new BehaviorSubject(null);
    
    private _storeSnooze: BehaviorSubject<StoreSnooze | null> = new BehaviorSubject(null);

    private _storeRegionCity: BehaviorSubject<City | null> = new BehaviorSubject(null);
    private _storeRegionCities: BehaviorSubject<City[] | null> = new BehaviorSubject(null);
    private _storeRegionCountries: ReplaySubject<StoreRegionCountry[]> = new ReplaySubject<StoreRegionCountry[]>(1);

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    /**
     * Constructor
     */
    constructor(
        private _httpClient: HttpClient,
        private _apiServer: AppConfig,
        private _authService: AuthService,
        private _logging: LogService
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    // ----------------------
    // Store
    //----------------------- 

    /** Getter for store */
    get store$(): Observable<Store> { return this._store.asObservable(); }
    /** Setter for stores */
    set store(value: Store) { this._store.next(value); }

    /** Getter for stores */
    get stores$(): Observable<Store[]> { return this._stores.asObservable(); }
    /** Setter for stores */
    set stores(value: Store[]) { this._stores.next(value); }
    /** Getter for stores pagination */
    get storesPagination$(): Observable<StorePagination> { return this._storesPagination.asObservable(); }

    // ----------------------
    // Store Category
    //----------------------- 

    /** Getter for store Category */
    get storeCategory$(): Observable<StoreCategory> { return this._storeCategory.asObservable(); }
    /** Setter for store Category */
    set storeCategory(value: StoreCategory) { this._storeCategory.next(value); }

    /** Getter for store Categories */
    get storeCategories$(): Observable<StoreCategory[]> { return this._storeCategories.asObservable(); }
    /** Setter for store Categories */
    set storeCategories(value: StoreCategory[]) { this._storeCategories.next(value); }

    // ----------------------
    // Store Discounts
    //----------------------- 

    /** Getter for store Discount */
    get storeDiscount$(): Observable<StoreDiscount> { return this._storeDiscount.asObservable(); }
    /** Setter for store Discount */
    set storeDiscount(value: StoreDiscount) { this._storeDiscount.next(value); }
    
    /** Getter for store Discounts */
    get storeDiscounts$(): Observable<StoreDiscount[]> { return this._storeDiscounts.asObservable(); }
    /** Setter for store Discounts */
    set storeDiscounts(value: StoreDiscount[]) { this._storeDiscounts.next(value); }

    // ----------------------
    // Store Snooze
    //----------------------- 

    /** Getter for store Snooze */
    get storeSnooze$(): Observable<StoreSnooze> { return this._storeSnooze.asObservable(); }
    /** Setter for store Snooze */
    set storeSnooze(value: StoreSnooze) { this._storeSnooze.next(value); }
 
    // ----------------------
    // Store region countries
    //----------------------- 

    /** Getter for store region countries */
    get storeRegionCountries$(): Observable<StoreRegionCountry[]> { return this._storeRegionCountries.asObservable(); }

    // ----------------------
    // Store region city
    //----------------------- 

    /** Getter for Store region city */
    get storeRegionCity$(): Observable<City> { return this._storeRegionCity.asObservable(); }
    /** Setter for Store region city */
    set storeRegionCity(value: City) { this._storeRegionCity.next(value); }
    
    /** Getter for city */
    get storeRegionCities$(): Observable<City[]> { return this._storeRegionCities.asObservable(); }
    /** Setter for city */
    set storeRegionCities(value: City[]) { this._storeRegionCities.next(value);  }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    // ---------------------------
    // Store Section
    // ---------------------------

    /**
     * Get store / stores
     */
    getStores(params: {
        id              : string;
        page            : number;
        size            : number;
        regionCountryId : string;
        sort            : string;
        order           : 'asc' | 'desc' | '';
        search          : string;
        category        : string;
    } = {
        id              : "", 
        page            : 0, 
        size            : 10, 
        regionCountryId : "" , 
        sort            : 'name', 
        order           : 'asc', 
        search          : '', 
        category        : ''
    }): 
        Observable<{ pagination: StorePagination; stores: Store[] }>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        let accessToken = this._authService.publicToken;

        const header = {
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
            params: params
        };

        // Delete empty value
        Object.keys(header.params).forEach(key => {
            if (Array.isArray(header.params[key])) {
                header.params[key] = header.params[key].filter(element => element !== null)
            }
            if (header.params[key] === null || (Array.isArray(header.params[key]) && header.params[key].length === 0)) {
                delete header.params[key];
            }
        });

        // if ada storeId change url stucture
        let storeId;
        if (header.params.id) { storeId = "/" + header.params.id } 
        
        return this._httpClient.get<{ pagination: StorePagination; stores: Store[] }>(productService + '/stores' + storeId, header)
            .pipe(
                tap((response) => {

                    let stores = response["data"].content;
                    
                    if (header.params.id) {
                        this._logging.debug("Response from StoresService (getStore) " + header.params.id, response);
                    } else {
                        
                        this._logging.debug("Response from StoresService (getStores)", response);
    
                        // Pagination
                        let _pagination = {
                            length: response["data"].totalElements,
                            size: response["data"].size,
                            page: response["data"].number,
                            lastPage: response["data"].totalPages,
                            startIndex: response["data"].pageable.offset,
                            endIndex: response["data"].pageable.offset + response["data"].numberOfElements - 1
                        };
                        
                        (stores).forEach(async (item, index) => {
                            this.stores[index] = Object.assign(this.stores[index],{slug: item.name.toLowerCase().replace(/ /g, '-').replace(/[-]+/g, '-').replace(/[^\w-]+/g, '')});
                            this.stores[index] = Object.assign(this.stores[index],{duration: 30});
                            this.stores[index] = Object.assign(this.stores[index],{totalSteps: 3});
                            this.stores[index] = Object.assign(this.stores[index],{featured: true});
                            this.stores[index] = Object.assign(this.stores[index],{progress: { completed: 2, currentStep: 2  }});
                            this.stores[index] = Object.assign(this.stores[index],{category: item.type});
                            this.stores[index] = Object.assign(this.stores[index],{completed: 2});
                            this.stores[index] = Object.assign(this.stores[index],{currentStep: 3});
                        });

                        this._stores.next(stores);
                        this._storesPagination.next(_pagination);
                    }
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

    // ---------------------------
    // Store Categories Section
    // ---------------------------

    getStoreCategories(storeId: string = "", name: string="", page: number = 0, size: number = 30, sort: string = 'sequenceNumber', order: 'asc' | 'desc' | '' = 'asc'): Observable<any>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
        let accessToken = "accessToken";

        const header = {
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
            params: {
                name        : '' + name,
                storeId     : '' + storeId,
                page        : '' + page,
                pageSize    : '' + size,
                sortByCol   : '' + sort,
                sortingOrder: '' + order.toUpperCase(),
            }
        };

        return this._httpClient.get<any>(productService + '/store-categories', header)
            .pipe(
                map((response) => {
                    this._logging.debug("Response from StoresService (getStoreCategories)",response);
                    
                    if (this._storeCategories.getValue()) {

                        let obsArray = this._storeCategories.getValue().map(x => x.id);
                        let respArray = response["data"].content.map(y => y.id);
    
                        // A function to compare arrays
                        const equals = (a: any[], b: any[]) =>
                        a.length === b.length &&
                        a.every((v, i) => v === b[i]);

                        // If not equals means we navigated to a different store, so set this._storeCategory to null
                        // This is to reset this._storeCategory observable
                        if (!equals(obsArray, respArray)) {
                            this._storeCategory.next(null);
                        }

                    }
                    this._storeCategories.next(response["data"].content);
                    return response["data"].content;
                })
            );
    }

    getStoreCategoriesById(id: string): Observable<StoreCategory>
    {
        return this._storeCategories.pipe(
            take(1),
            map((storeCategories) => {
                if (storeCategories) {

                    // Find the storeCategory 
                    const storeCategory = storeCategories.find(item => item.id === id) || null;
    
                    this._logging.debug("Response from StoresService (getStoreCategoriesById)", storeCategory);
    
                    // Update the storeCategory
                    this._storeCategory.next(storeCategory);
    
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

    getStoreDiscounts(storeId: string): Observable<any>
    {
        let productService = this._apiServer.settings.apiServer.productService;
        //let accessToken = this._jwt.getJwtPayload(this._authService.jwtAccessToken).act;
        let accessToken = "accessToken";

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`),
        };

        return this._httpClient.get<any>(productService + '/stores/' + storeId + '/discount/active', header)
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

        return this.storeRegionCities$.pipe(
            take(1),
            switchMap(cities => this._httpClient.get<any>(productService + '/region-country-state-city', header).pipe(
                map((response) => {
                    this._logging.debug("Response from StoresService (getStoreRegionCountryStateCity)",response);

                    // ---------------
                    // Update Store
                    // ---------------
                    if (isResolved) {
                        this._storeRegionCities.next(response.data);
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
