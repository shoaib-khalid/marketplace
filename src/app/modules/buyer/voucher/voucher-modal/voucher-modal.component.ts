import { Component, Inject, OnInit } from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { CustomerVoucher } from '../voucher.types';

@Component({
  selector: 'voucher-moal',
  templateUrl: './voucher-modal.component.html',
})
export class VoucherModalComponent implements OnInit {

    icon: string;
    title: string;
    description: string;
    voucher: CustomerVoucher;

    constructor(
        private dialogRef: MatDialogRef<VoucherModalComponent>,
        @Inject(MAT_DIALOG_DATA) private data: any
    ) { }

    ngOnInit(): void {
        this.icon = this.data['icon'];
        this.title = this.data['title'];
        this.description = this.data['description'];
        this.voucher = this.data['voucher'];
       
    }

    okButton() {
        this.dialogRef.close();
    }

}