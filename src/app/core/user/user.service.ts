import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of, ReplaySubject, throwError } from 'rxjs';
import { catchError, filter, map, switchMap, take, tap } from 'rxjs/operators';
import { Client, Customer, CustomerAddress, HttpResponse, User, UserSession } from 'app/core/user/user.types';
import { AppConfig } from 'app/config/service.config';
import { JwtService } from 'app/core/jwt/jwt.service';
import { LogService } from 'app/core/logging/log.service';
import { AuthService } from '../auth/auth.service';

@Injectable({
    providedIn: 'root'
})
export class UserService
{
    private _user: ReplaySubject<User> = new ReplaySubject<User>(1);
    private _customer: BehaviorSubject<Customer | null> = new BehaviorSubject(null);
    private _client: BehaviorSubject<Client | null> = new BehaviorSubject(null);

    private _customerAddress: BehaviorSubject<CustomerAddress | null> = new BehaviorSubject(null);
    private _customerAddresses: BehaviorSubject<CustomerAddress[] | null> = new BehaviorSubject(null);

    private _userSession: BehaviorSubject<UserSession | null> = new BehaviorSubject(null);
    
    /**
     * Constructor
     */
    constructor(
        private _httpClient: HttpClient,
        private _apiServer: AppConfig,
        private _authService: AuthService,
        private _jwt: JwtService,
        private _logging: LogService
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Setter & getter for user
     *
     * @param value
     */
    set user(value: User)
    {
        // Store the value
        this._user.next(value);
    }

    get user$(): Observable<User>
    {
        return this._user.asObservable();
    }

    /**
     * Setter & getter for user
     *
     * @param value
     */
    set customer(value: Customer)
    {
        // Store the value
        this._customer.next(value);
    }

    get customer$(): Observable<Customer>
    {
        return this._customer.asObservable();
    }

    /**
     * Setter & getter for user
     *
     * @param value
     */
    set client(value: Client)
    {
        // Store the value
        this._client.next(value);
    }

    get client$(): Observable<Client>
    {
        return this._client.asObservable();
    }

    /**
     * Setter & getter for customersAddresses
     *
     * @param value
     */
    get customersAddresses$(): Observable<CustomerAddress[]>
    {
        return this._customerAddresses.asObservable();
    }

    set customersAddresses(value: CustomerAddress[])
    {
        // Store the value
        this._customerAddresses.next(value);
    }

    /**
     * Setter & getter for customersAddress
     *
     * @param value
     */
    get customerAddress$(): Observable<CustomerAddress>
    {
        return this._customerAddress.asObservable();
    }

    set customersAddress(value: CustomerAddress)
    {
        // Store the value
        this._customerAddress.next(value);
    }

    /**
     * Setter for guestAddress
     */
    set guestAddress(value: string)
    {
        localStorage.setItem('guestAddresses', value);
    }

    /**
     * Getter for guestAddress
     */
    get guestAddress$(): any
    {
        return localStorage.getItem('guestAddresses') ?? '';
    }

    get userSession$(): Observable<UserSession>
    {
        return this._userSession.asObservable();
    }
    
    get userSessionId$(): string
    {
        return sessionStorage.getItem('userSessionId') ?? '';
    }

    set userSessionId(value: string)
    {
        sessionStorage.setItem('userSessionId', value);
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get the current logged in user data
     * (Used by app.resolver)
     */
    get(ownerId: string): Observable<any>
    {
        // Throw error, if the user is already logged in
        if ( !ownerId )
        {
            this._logging.debug("User not logged in");
            return of(true);
        }

        let userService = this._apiServer.settings.apiServer.userService;
        let customerId = this._jwt.getJwtPayload(this._authService.jwtAccessToken).uid;  

        const header = {
            headers: new HttpHeaders().set("Authorization", this._authService.publicToken)
        };

        return this._httpClient.get<any>(userService + "/customers/" + ownerId, header)
            .pipe(
                catchError(() =>
                    // Return false
                    of(false)
                ),
                switchMap(async (user: any) => {
                                
                    this._logging.debug("Response from UserService (getCustomerById)", user);
                    this._user.next(user['data']);

                    return user['data'];
                })
            );
    }

    putCustomerById(payloadBody)
    {
        let userService = this._apiServer.settings.apiServer.userService;
        let customerId = this._jwt.getJwtPayload(this._authService.jwtAccessToken).uid;  

        const header = {
            headers: new HttpHeaders().set("Authorization", this._authService.publicToken)
        };

        return this._httpClient.put<HttpResponse<Customer>>(userService + "/customers/" + customerId, payloadBody, header)
            .pipe(
                tap((update:HttpResponse<Customer>) => {
                    this._logging.debug("Response from UserService (putCustomerById)",update);
                }
            )
        );
    }

    /**
     * Update the user
     *
     * @param user
     */
    update(user: User): Observable<any>
    {
        return this._httpClient.patch<User>('api/common/user', {user}).pipe(
            map((response) => {
                this._user.next(response);
            })
        );
    }

    /**
     * ========================================
     *Customer Address Controller
     ===========================================
     */
    getCustomerAddresses(): Observable<any>
    {
        let userService = this._apiServer.settings.apiServer.userService;
        let customerId = this._jwt.getJwtPayload(this._authService.jwtAccessToken).uid;  

        if (customerId) {
            const header = {
                headers: new HttpHeaders().set("Authorization", this._authService.publicToken)
            };
    
            return this._httpClient.get<any>(userService + "/customer/" + customerId +'/address', header)
                .pipe(
                    map((address: CustomerAddress) => {
                        this._logging.debug("Response from UserService (getCustomerAddresses)",address);
                        this._customerAddresses.next(address["data"].content);
    
                        let defaultAddressIndex = address["data"].content.findIndex(item => item.isDefault === true);
                        
                        if (defaultAddressIndex > -1) {
                            this._customerAddress.next(address["data"].content[defaultAddressIndex]);
                        } else {
                            this._customerAddress.next(address["data"].content[0]);
                        }

                        return address["data"].content;
                    }
                )
            );

        }
        else {
            return of({})
                .pipe(
                    map(resp => {

                        let addresses = this.guestAddress$ ? JSON.parse(this.guestAddress$) : [];

                        let defaultAddressIndex = addresses.findIndex(item => item.isDefault === true);
                        
                        this._customerAddresses.next(addresses);
                        
                        if (defaultAddressIndex > -1) {
                            this._customerAddress.next(addresses[defaultAddressIndex]);
                        } else {
                            this._customerAddress.next(addresses[0]);
                        }

                        return addresses;
                        
                    })
                );
        }
    }

    getSelectedCustomerAddress(id: string): Observable<CustomerAddress>
    {
        return this._customerAddresses.pipe(
            take(1),
            map((addresses) => {

                // Find the store
                const address = addresses.find(item => item.id === id) || null;

                this._logging.debug("Response from StoresService (getSelectedCustomerAddress)",address);

                // Update the store
                this._customerAddress.next(address);

                // Return the store
                return address;
            }),
            switchMap((address) => {

                if ( !address )
                {
                    return throwError('Could not found store with id of ' + id + '!');
                }

                return of(address);
            })
        );
    }

    // getSelectedCustomerAddress()
    // {
    //     return this.customerAddress$
    //         .pipe(
    //             map((address: CustomerAddress) => {
    //                 this._logging.debug("Response from UserService (getCustomerAddress)",address);
    //                 this._customerAddresses.next(address["data"].content);
    //             }
    //         )
    //     );
    // }

    getCustomerAddressByCustomerId()
    {
        let userService = this._apiServer.settings.apiServer.userService;
        //let accessToken = this._jwt.getJwtPayload(this.accessToken).act;
        let accessToken = "accessToken";
        let customerId = this._jwt.getJwtPayload(this._authService.jwtAccessToken).uid;

        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${accessToken}`)
        };

        return this._httpClient.get<CustomerAddress>(userService + '/customer/' + customerId + '/address', header)
            .pipe(
                map((response) => {
                    this._logging.debug("Response from UserService (getCustomerAddress)",response);

                    let defaultAddressIndex = response["data"].content.findIndex(item => item.default === true);
                    let customerDefaultAddress: CustomerAddress;
                    if (response["data"].content && response["data"].content.length) {
                        if (defaultAddressIndex > -1) {
                            customerDefaultAddress = response["data"].content[defaultAddressIndex]
                        } else {
                            customerDefaultAddress = response["data"].content[0];
                        }
                    }
                    this._customerAddress.next(customerDefaultAddress);
                })
            );
    }

    getCustomerAddressById(addressId: string)
    {
        let userService = this._apiServer.settings.apiServer.userService;
        let customerId = this._jwt.getJwtPayload(this._authService.jwtAccessToken).uid;  

        const header = {
            headers: new HttpHeaders().set("Authorization", this._authService.publicToken)
        };

        return this._httpClient.get<HttpResponse<CustomerAddress>>(userService + "/customer/" + customerId +'/address'+ addressId, header)
            .pipe(
                tap((address:HttpResponse<CustomerAddress>) => {
                    this._logging.debug("Response from UserService (getCustomerAddressById)",address);
                    this._customerAddress.next(address.data);

                }
            )
        );
    }

    createCustomerAddress(body: CustomerAddress): Observable<CustomerAddress>
    {
        let userService = this._apiServer.settings.apiServer.userService;
        let customerId = this._jwt.getJwtPayload(this._authService.jwtAccessToken).uid;  

        const header = {
            headers: new HttpHeaders().set("Authorization", this._authService.publicToken)
        };

        return this.customersAddresses$.pipe(
            take(1),
            // switchMap(address => this._httpClient.post<InventoryDiscount>('api/apps/ecommerce/inventory/discount', {}).pipe(
            switchMap(addresses => this._httpClient.post<CustomerAddress>(userService + "/customer/" + customerId +'/address',body, header).pipe(
                map((newAddress) => {

                    this._logging.debug("Response from addressService (createAddress)",newAddress);

                    //If newly data is set to default address
                    if(newAddress["data"].isDefault === true){
                        const findDefaultTrue = addresses.find(item => item.isDefault === true);
                        const indexDefaultTrue = addresses.findIndex(item => item.isDefault === true);
                        findDefaultTrue.isDefault = false;
                        addresses[indexDefaultTrue] = { ...addresses[indexDefaultTrue], ...findDefaultTrue};
                    }
                    
                    if (addresses) {
                        // Update the address with the new discount
                        this._customerAddresses.next([newAddress["data"], ...addresses]);
                        this._customerAddress.next(newAddress["data"]);
                    } else {
                        this._customerAddresses.next([newAddress["data"]]);
                        this._customerAddress.next(newAddress["data"]);
                    }

                    // Return the new discount
                    return newAddress;
                })
            ))
        );
    }

    
    putCustomerAddressById(customerAddressBody:CustomerAddress)
    {
        let userService = this._apiServer.settings.apiServer.userService;
        let customerId = this._jwt.getJwtPayload(this._authService.jwtAccessToken).uid;  

        const header = {
            headers: new HttpHeaders().set("Authorization", this._authService.publicToken)
        };

        return this.customersAddresses$.pipe(
            take(1),
            switchMap(address => this._httpClient.put<HttpResponse<CustomerAddress>>(userService + "/customer/" + customerId +'/address/'+ customerAddressBody.id, customerAddressBody, header).pipe(
                map((updatedAddress) => {

                    this._logging.debug("Response from addressService (putCustomerAddressById)", updatedAddress);

                    // Find the index of the updated address
                    const index = address.findIndex(item => item.id === customerAddressBody.id);

                    const isCurrentDataDefault = address.find(item => item.isDefault === true && item.id === customerAddressBody.id);

                    //if the newly data is isDefault === true we need to chnage the existing one that to false
                    if(!isCurrentDataDefault){
                        if(updatedAddress.data.isDefault === true){

                            const findDefaultTrue = address.find(item => item.isDefault === true);
                            const indexDefaultTrue = address.findIndex(item => item.isDefault === true);
                            findDefaultTrue.isDefault =false;
                            address[indexDefaultTrue] = { ...address[indexDefaultTrue], ...findDefaultTrue};
                        }
                    }

                    // Update the address
                    address[index] = { ...address[index], ...updatedAddress.data};
                    this._customerAddresses.next(address); 
            
                    // Return the updated address
                    return updatedAddress["data"];
                }),
                switchMap(updatedAddress => this.customerAddress$.pipe(
                    take(1),
                    filter(item => item && item.id === customerAddressBody.id),
                    tap(() => {
                        // Update the address if it's selected
                        this._customerAddress.next(updatedAddress);

                        // Return the updated address
                        return updatedAddress;
                    })
                ))
            ))
        );
    }

    setDefaultCustomerAddressById(customerAddressBody:CustomerAddress)
    {
        let userService = this._apiServer.settings.apiServer.userService;
        let customerId = this._jwt.getJwtPayload(this._authService.jwtAccessToken).uid;  

        customerAddressBody.isDefault = true;

        const header = {
            headers: new HttpHeaders().set("Authorization", this._authService.publicToken)
        };

        return this.customersAddresses$.pipe(
            take(1),
            switchMap(address => this._httpClient.put<HttpResponse<CustomerAddress>>(userService + "/customer/" + customerId +'/address/'+ customerAddressBody.id, customerAddressBody, header).pipe(
                map((updatedAddress) => {

                    this._logging.debug("Response from addressService (setDefaultCustomerAddressById)", updatedAddress);


                    // Find the index of the updated address
                    const index = address.findIndex(item => item.id === customerAddressBody.id);

                    const isSetDefault = address.find(item => item.isDefault === true && item.id === customerAddressBody.id);

                    //if current set to default === true we need to chnage the existing one that to false
                    if(isSetDefault){
                            const findExistDefaultTrue = address.find(item => item.isDefault === true && item.id !== customerAddressBody.id);
                            const indexDefaultTrue = address.findIndex(item => item.isDefault === true && item.id !== customerAddressBody.id);
                            findExistDefaultTrue.isDefault =false;
                            address[indexDefaultTrue] = { ...address[indexDefaultTrue], ...findExistDefaultTrue};
                    }

                    // Update the address
                    address[index] = { ...address[index], ...updatedAddress.data};

                    this._customerAddresses.next(address); 
            
                    // Return the updated address
                    return updatedAddress["data"];
                }),
                switchMap(updatedAddress => this.customerAddress$.pipe(
                    take(1),
                    filter(item => item && item.id === customerAddressBody.id),
                    tap(() => {

                        // Update the address if it's selected
                        this._customerAddress.next(updatedAddress["data"]);

                        // Return the updated address
                        return updatedAddress["data"];
                    })
                ))
            ))
        );
    }

    deleteCustomerAddressById(customerAddressId:string)
    {
        let userService = this._apiServer.settings.apiServer.userService;
        let customerId = this._jwt.getJwtPayload(this._authService.jwtAccessToken).uid;  

        const header = {
            headers: new HttpHeaders().set("Authorization", this._authService.publicToken)
        };

        return this.customersAddresses$.pipe(
            take(1),
            switchMap(address => this._httpClient.delete<HttpResponse<CustomerAddress>>(userService + "/customer/" + customerId +'/address/'+ customerAddressId, header).pipe(
                map((status:any) => {

                    this._logging.debug("Response from addressService (deleteCustomerAddressById)", status);

                    // Find the index of the deleted address
                    const index = address.findIndex(item => item.id === customerAddressId);

                    // Delete the address
                    address.splice(index, 1);

                    // Update the address
                    this._customerAddresses.next(address);

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

    changePasswordCustomerById(changePwdPayload)
    {

        let userService = this._apiServer.settings.apiServer.userService;
        let customerId = this._jwt.getJwtPayload(this._authService.jwtAccessToken).uid;  

        const header = {
            headers: new HttpHeaders().set("Authorization", this._authService.publicToken)
        };

   
        return this.client$.pipe(
            take(1),
            switchMap(client => this._httpClient.put<any>(userService + '/customers/' + customerId + '/changepassword', changePwdPayload , header).pipe(
                map((response) => {

                    this._logging.debug("Response from StoresService (chnagePasswordCustomerById)",response);

                    // Return the new product
                    return response["data"];
                })  
            )) 
        );
    }

    deactivateCustomerById()
    {
        let userService = this._apiServer.settings.apiServer.userService;
        let customerId = this._jwt.getJwtPayload(this._authService.jwtAccessToken).uid;

        const header = {
            headers: new HttpHeaders().set("Authorization", this._authService.publicToken)
        };

   
        return this.client$.pipe(
            take(1),
            switchMap(client => this._httpClient.put<any>(userService + '/customers' + '/deactivate/' + customerId , header).pipe(
                map((response) => {

                    this._logging.debug("Response from UserService (deactivateCustomerById)",response);

                    // Return the new product
                    return response["data"];
                })  
            )) 
        );
    }

    generateSession(body: UserSession): Observable<any>
    {        
        let userService = this._apiServer.settings.apiServer.userService;

        const header = {
            headers: new HttpHeaders().set("Authorization", this._authService.publicToken)
        };

        return this._httpClient.post<any>(userService + "/guest/generateSession", body, header).pipe(
            map((response) => {

                this._logging.debug("Response from addressService (generateSession)", response);

                // Resolved
                this._userSession.next(response["data"]);

                // Return the deleted status
                return response["data"];
            })
        );
    }
}
