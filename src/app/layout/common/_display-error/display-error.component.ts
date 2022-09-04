import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, ViewEncapsulation } from '@angular/core';
import { DisplayErrorService } from 'app/core/display-error/display-error.service';
import { Subject, takeUntil } from 'rxjs';
import { AppConfig } from 'app/config/service.config';

@Component({
    selector       : 'display-error',
    templateUrl    : './display-error.component.html',
    encapsulation  : ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DisplayErrorComponent
{
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    error: {
        type        : string;
        code        : string;
        title       : string;
        message     : string;
        aftereffect?: 'reload' | 'back';
    } = null;

    /**
     * Constructor
     */
    constructor(
        private _displayErrorService: DisplayErrorService,
        private _apiServer: AppConfig,
        private _changeDetectorRef: ChangeDetectorRef
    )
    {
        // Subscribe to show error message
        this._displayErrorService.errorMessage$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response) => {
                if (response) {
                    this.error = response;
                    let loggingLevel = this._apiServer.settings.logging;
                    if (response.code.toString().match(/^5\d{2}/) && loggingLevel === 6){
                        this.error.message = "Server Error "+ response.code +". Our staff has been notified, thank you for your understanding.";
                    }              
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });   
    }

    doAction()
    {
        if (this.error && this.error.aftereffect) {
            if (this.error.aftereffect === "reload"){
                // Reload the app
                location.reload();
                return;
            } else {
                window.history.back();
                return;
            }
        } else{
            window.history.back();
            return;
        }
    }
}
