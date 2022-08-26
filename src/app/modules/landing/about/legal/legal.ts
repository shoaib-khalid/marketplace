/* eslint-disable max-len */
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector       : 'legal',
    templateUrl    : './legal.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LegalComponent implements OnInit
{
    docId: string;
    

    /**
     * Constructor
     */
    constructor(
        private _route: ActivatedRoute,
    )
    {
    }
    ngOnInit(): void {

        this.docId = this._route.snapshot.paramMap.get('id');
        
    }

}
