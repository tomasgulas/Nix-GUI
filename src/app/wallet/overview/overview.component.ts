import { Component, OnInit, OnDestroy } from '@angular/core';
import { faCircle } from '@fortawesome/free-regular-svg-icons';
import { faArrowDown, faArrowUp, faCircle as faCircleSolid, faDollarSign, faQuestion, faSync } from '@fortawesome/free-solid-svg-icons';
import { faBtc } from '@fortawesome/free-brands-svg-icons';
import { MatSlideToggleChange } from '@angular/material';
import { NgxSpinnerService } from 'ngx-spinner';

import { ModalsService } from '../modals/modals.service';
import { FAQ } from '../shared/faq.model';
import { faq } from './faq';
import { Router } from '@angular/router';
import { IWalletInfo, WalletInfo, IBitcoinprice, bitcoinprice, INodeinfo, NodeInfo, IRecentTransactionInfo, RecentTransactionInfo } from '../business-model/entities';
import { WalletService } from '../wallet.service';
import { TransactionBuilder } from '../business-model/entities';
import { ApiEndpoints, categories, message } from '../business-model/enums';
import { RpcStateService } from '../../core/core.module';
import { Amount } from '../shared/util/utils';
import { Log } from 'ng2-logger';
import { CalculationsService } from '../calculations.service';
import { SnackbarService } from '../../core/core.module';

@Component({
  selector: 'wallet-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit, OnDestroy {

  USDvaultbalance: number;
  EURvaultbalance: number;
  BTCvaultbalance: number;
  USDwalletbalance: number;
  BTCwalletbalance: number;
  EURwalletbalance: number;
  NIXpercentage: any;
  balanceInUSD: any;
  balanceInBTC: any;
  balanceInEUR: any;
  
  faCircle: any = faCircle;
  faQuestion: any = faQuestion;
  faSync: any = faSync;
  faCircleSolid: any = faCircleSolid;
  faArrowUp: any = faArrowUp;
  faArrowDown: any = faArrowDown;
  faBtc: any = faBtc;
  faq: Array<FAQ> = faq;
  transactionColumns: string[] = ['date', 'category', 'confirmations', 'amount'];
  private destroyed: boolean = false;
  walletInfo: IWalletInfo = new WalletInfo();
  private log: any = Log.create(`overview.component `);
  public status;
  public torEnabled: boolean;
  public currentCurrency: string;
  bitcoinpriceInfo: IBitcoinprice = new bitcoinprice();
  getNodeInfo: INodeinfo = new NodeInfo();
  public ghostNodes = {}
  public bitcoinprice;
  public monthEarn: number = 0;
  public node: number = 0;
  isActiveNodeCount = 0;
 
  // lineChart
  public lineChartData: Array<any> = [
    // {data: [65, 59, 80, 81, 56, 55, 40], label: 'Series A'},
    // { data: [40, 19, 86, 27, 90], label: 'Series B' },
    { data: [0,0.2,0.25,0.6, 0.3, 0.34, 0.29, 0.26], label: 'NIX' }
  ];
  public lineChartLabels: Array<any> = ['Mar', 'Apr', 'May','Jun','Jul','Aug','Sep','Oct'];
  public lineChartOptions: any = {
    responsive: true
  };
  public lineChartColors: Array<any> = [
    { // grey
      backgroundColor: 'rgba(148,159,177,0.2)',
      borderColor: 'rgba(148,159,177,1)',
      pointBackgroundColor: 'rgba(148,159,177,1)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgba(148,159,177,0.8)'
    }
  ];
  public lineChartLegend: boolean = true;
  public lineChartType: string = 'line';

  constructor(
    private modalsService: ModalsService,
    private router: Router,
    private calculationsService: CalculationsService,
    private walletServices: WalletService,
    private flashNotification: SnackbarService,
    private spinner: NgxSpinnerService,
    private _rpcState: RpcStateService
  ) { }

  ngOnInit() {
    this.spinner.show();
    this.currentCurrency = this.walletServices.getCurrency();
    this._rpcState.registerStateCall(ApiEndpoints.Torstatus, 1000, );
    this._rpcState.registerStateCall(ApiEndpoints.GetWalletInfo, 1000);
    this._rpcState.registerStateCall(ApiEndpoints.Ghostnode, 1000, ['count']);

    this.init();
    this.getnodestatus();
  }

  ngAfterViewInit() {
    this.getTorstatus();
  }

  // events
  public chartClicked(e: any): void {
    console.log(e);
  }

  public chartHovered(e: any): void {
    console.log(e);
  }

  //refresh the overview screen(price)
  public refresh() {
    this.init();
  }

  //get wallet informations
  private init() {
    this._rpcState.observe(ApiEndpoints.GetWalletInfo)
      .takeWhile(() => !this.destroyed)
      .subscribe(walletInfo => {
        this.spinner.hide();
        this.walletInfo = new WalletInfo(walletInfo).toJSON();
        this.walletServices.getBitcoin(this.bitcoinpriceInfo)
          .subscribe(bitcoinpriceInfos => {
            this.bitcoinprice = bitcoinpriceInfos.data.quotes;
            this.balanceInBTC = this.bitcoinprice.BTC.price;
            this.balanceInUSD = this.bitcoinprice.USD.price;
            this.NIXpercentage = this.bitcoinprice.USD.percent_change_24h
          
            this.getBTCBalance();
            this.getUSDBalance();
            this.getBTCVaultBalance();
            this.getUSDVaultBalance();
          }, error => this.log.error(message.bitcoinpriceMessage, error));

        this.walletServices.getInEUR(this.bitcoinpriceInfo)
          .subscribe(res => {

            let tmp = res.data.quotes;
            this.balanceInEUR = tmp.EUR.price;
          
            this.getEURBalance();
            this.getEURVaultBalance();
          }, error => this.log.error(message.bitcoinpriceMessage, error));
      },
        error => this.log.error(message.walletMessage, error));
  }

  getBTCBalance() {
    this.BTCwalletbalance = this.calculationsService.getCovertedamount(this.walletInfo.balance,this.balanceInBTC);
  }

  getUSDBalance() {
    this.USDwalletbalance = this.calculationsService.getCovertedamount(this.walletInfo.balance, this.balanceInUSD);
  }

  getEURBalance() {
    this.EURwalletbalance = this.calculationsService.getCovertedamount(this.walletInfo.balance, this.balanceInEUR);
  }

  getBTCVaultBalance() {
    this.BTCvaultbalance = this.calculationsService.getCovertedamount(this.walletInfo.ghost_vault, this.balanceInBTC);
  }

  getUSDVaultBalance() {    
    this.USDvaultbalance = this.calculationsService.getCovertedamount(this.walletInfo.ghost_vault, this.balanceInUSD);
  }

  getEURVaultBalance() {
    this.EURvaultbalance = this.calculationsService.getCovertedamount(this.walletInfo.ghost_vault, this.balanceInEUR);
  }

  // get tor status
  private getTorstatus() {
    this.walletServices.getTorstatus()
      .takeWhile(() => !this.destroyed)
      .subscribe(res => {
        this.torEnabled = (res.indexOf("Enabled") > -1);
      }, error => { 
        this.flashNotification.open(error.message, 'err')
        this.log.error(error.message, error); 
    })
  }
  
  // Enable/disable tor status
  private torToggled(event: MatSlideToggleChange) {
    this.walletServices.enableTor(event.checked ? 'true' : 'false')
      .takeWhile(() => !this.destroyed)
      .subscribe(res => {
        this.flashNotification.open(res, 'err')
      }, error => { 
        this.flashNotification.open(error.message, 'err')
        this.log.error(error.message, error); 
    })
    
  }
  // get node status
  private getnodestatus() {
    this._rpcState.observe(ApiEndpoints.Ghostnode)
      .takeWhile(() => !this.destroyed)
      .subscribe(NodeInformations => {
        this.log.d('get node status')
        this.isActiveNodeCount = NodeInformations;
      },
        error => this.log.error(message.recentTransactionMessage, error));
  }

  
  goToChart() {
    this.router.navigate(['./overview/nix-price-chart']);
  }

  openSyncingWallet() {
    const data: any = {
      forceOpen: true,
      modalsService: this.modalsService
    };
    this.modalsService.openSmall('syncingWallet', data);
  }

  openSend(walletType: string) {
    const data: any = {
      forceOpen: true,
      walletType: walletType,
      balance: this.walletInfo.balance,
      amountInUSD: this.bitcoinprice.USD.price,
      modalsService: this.modalsService
    };

    if (walletType == 'vault') data.balance = this.walletInfo.ghost_vault;
    
    this.modalsService.openSmall('send', data);
  }

  openReceive(walletType: string) {
    const data: any = {
      forceOpen: true,
      walletType: walletType,
      balance: this.walletInfo.balance,
      amountInUSD: this.bitcoinprice.USD.price,
      modalsService: this.modalsService
    };
    this.modalsService.openSmall('receive', data);
  }

  ngOnDestroy() {
    this.destroyed = true;
  }
}
