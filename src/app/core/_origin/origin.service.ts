import { Injectable } from '@angular/core';
import { Observable, of, ReplaySubject, tap } from 'rxjs';
import { LogService } from 'app/core/logging/log.service';
import { RouterStateSnapshot } from '@angular/router';


@Injectable({
    providedIn: 'root'
})
export class OriginService
{
    private _origin: ReplaySubject<any> = new ReplaySubject<any>(1);

    /**
     * Constructor
     */
    constructor(
        private _logging: LogService
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /** Getter for groupOrder **/
    get origin$(): Observable<any> { return this._origin.asObservable(); }
    /** Setter for groupOrder **/
    set origin(value: any) { this._origin.next(value)};
    
    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    checkOrigin(state: RouterStateSnapshot): Observable<any>
    {
        return of(true).pipe(
            tap(()=>{
                if (state.url.split("?").length > 1) {
                    const params = this.parseUrlParams(state.url.split("?")[1]);
                    if (params && params["origin"]){
                        if (params["origin"] === "payhub2u") {
                            this._logging.debug("Origin from Payhub2U")
                            this._origin.next(params["origin"]);
                        } else {
                            console.error("Invalid origin");   
                        }
                    }
                }
            })
        )
    }

    parseUrlParams(urlString: string)
    {
        const urlParams = new URLSearchParams(urlString);
        const entries = urlParams.entries(); //returns an iterator of decoded [key,value] tuples
        const params = this.paramsToObject(entries); //{abc:"foo",def:"[asf]",xyz:"5"}

        return params;
    }
    
    paramsToObject(entries) 
    {
        const result = {}
        for(const [key, value] of entries) { // each 'entry' is a [key, value] tupple
          result[key] = value;
        }
        return result;
    }
}
