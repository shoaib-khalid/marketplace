import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { LogService } from 'app/core/logging/log.service';

@Injectable({
    providedIn: 'root'
})
export class DisplayErrorService
{
    private _errorMessage$: BehaviorSubject<{ type: string, code: string, title: string, message: string} | null> = new BehaviorSubject<{ type: string, code: string, title: string, message: string}>(null);

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

    /**
     * Getter for error 500 message
     */
    get errorMessage$(): Observable<{ type: string, code: string, title: string, message: string}>
    {
        return this._errorMessage$.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Show the error 500
     */
    show(error: { type: string, code: string, title: string, message: string, aftereffect?: string} = null): void
    {
        this._logging.debug("Response from DisplayErrorService (show)",error);
        this._errorMessage$.next(error);
    }

    /**
     * Hide the error 500
     */
    hide(): void
    {
        this._logging.debug("Response from DisplayErrorService (hide)",true);
        this._errorMessage$.next(null);
    }

}
