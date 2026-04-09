"""
Fetches value metrics for US-listed stocks with market cap > $300M using yfinance.
Outputs public/data/stocks.json consumed by the React frontend.
"""

import json
import time
import os
from datetime import datetime, timezone

import yfinance as yf

# S&P 1500 tickers (S&P 500 + S&P 400 MidCap + S&P 600 SmallCap)
# Covers most US stocks with market cap above ~$300M
# Source list kept inline to avoid external dependency at runtime
TICKERS = [
    "A","AAL","AAP","AAPL","ABBV","ABC","ABMD","ABT","ACN","ADBE","ADI","ADM",
    "ADP","ADSK","AEE","AEP","AES","AFL","AIG","AIZ","AJG","AKAM","ALB","ALGN",
    "ALK","ALL","ALLE","AMAT","AMCR","AMD","AME","AMGN","AMP","AMT","AMZN","ANET",
    "AON","AOS","APA","APD","APH","APTV","ARE","ATO","ATVI","AVB","AVGO","AVY",
    "AWK","AXP","AZO","BA","BAC","BALL","BAX","BBY","BDX","BEN","BF.B","BIO",
    "BIIB","BK","BKNG","BKR","BLK","BMY","BR","BRK.B","BSX","BWA","BXP","C",
    "CAG","CAH","CARR","CAT","CB","CBOE","CBRE","CCI","CCL","CDNS","CDW","CE",
    "CF","CFG","CHD","CHRW","CHTR","CI","CINF","CL","CLX","CMA","CMCSA","CME",
    "CMG","CMI","CMS","CNC","CNP","COF","COO","COP","COST","CPB","CPRT","CRL",
    "CRM","CSCO","CSX","CTAS","CTLT","CTRA","CTSH","CTVA","CVS","CVX","D",
    "DAL","DD","DE","DFS","DG","DGX","DHI","DHR","DIS","DISH","DLR","DLTR",
    "DOV","DOW","DPZ","DRE","DRI","DTE","DUK","DVA","DVN","DXC","DXCM","EA",
    "EBAY","ECL","ED","EFX","EIX","EL","EMN","EMR","EOG","EPAM","EQIX","EQR",
    "EQT","ES","ESS","ETN","ETR","ETSY","EVRG","EW","EXC","EXPD","EXPE","EXR",
    "F","FANG","FAST","FB","FBHS","FCX","FDS","FDX","FE","FFIV","FIS","FISV",
    "FITB","FLT","FMC","FOX","FOXA","FRC","FRT","FTNT","FTV","GD","GE","GILD",
    "GIS","GL","GLW","GM","GNRC","GOOGL","GPC","GPN","GPS","GRMN","GS","GWW",
    "HAL","HAS","HBAN","HCA","HD","HES","HIG","HII","HLT","HOLX","HON","HPE",
    "HPQ","HRL","HSIC","HST","HSY","HUM","HWM","IBM","ICE","IDXX","IEX","IFF",
    "ILMN","INCY","INFO","INTC","INTU","IP","IPG","IQV","IR","IRM","ISRG","IT",
    "ITW","IVZ","J","JBHT","JCI","JKHY","JNJ","JNPR","JPM","K","KEY","KEYS",
    "KHC","KIM","KLAC","KMB","KMI","KMX","KO","KR","L","LDOS","LEN","LH","LHX",
    "LIN","LKQ","LLY","LMT","LNC","LNT","LOW","LRCX","LUMN","LUV","LVS","LW",
    "LYB","LYV","MA","MAA","MAR","MAS","MCD","MCHP","MCK","MCO","MDLZ","MDT",
    "MET","META","MGM","MHK","MKC","MKTX","MLM","MMC","MMM","MNST","MO","MOS",
    "MPC","MPWR","MRK","MRNA","MRO","MS","MSCI","MSFT","MTB","MTCH","MTD","MU",
    "NCLH","NDAQ","NEE","NEM","NFLX","NI","NKE","NOC","NOW","NRG","NSC","NTAP",
    "NTRS","NUE","NVDA","NVR","NWL","NWS","NWSA","NXPI","O","ODFL","OGN","OKE",
    "OMC","ORCL","ORLY","OTIS","OXY","PAYC","PAYX","PCAR","PEAK","PEG","PENN",
    "PEP","PFE","PFG","PG","PGR","PH","PHM","PKG","PKI","PLD","PM","PNC","PNR",
    "PNW","POOL","PPG","PPL","PRU","PSA","PSX","PTC","PVH","PWR","PXD","PYPL",
    "QCOM","QRVO","RCL","RE","REG","REGN","RF","RHI","RJF","RL","RMD","ROK",
    "ROL","ROP","ROST","RSG","RTX","SBAC","SBUX","SEDG","SEE","SHW","SIVB",
    "SJM","SLB","SNA","SNPS","SO","SPG","SPGI","SRE","STE","STT","STX","STZ",
    "SWK","SWKS","SYF","SYK","SYY","T","TAP","TDG","TDY","TECH","TEL","TER",
    "TFC","TFX","TGT","TJX","TMO","TMUS","TPR","TRMB","TROW","TRV","TSCO","TSLA",
    "TSN","TT","TTWO","TXN","TXT","TYL","UA","UAA","UAL","UDR","UHS","ULTA",
    "UNH","UNM","UNP","UPS","URI","USB","V","VFC","VIAC","VLO","VMC","VNO","VRSK",
    "VRSN","VRTX","VTR","VZ","WAB","WAT","WBA","WDC","WEC","WELL","WFC","WHR",
    "WM","WMB","WMT","WRB","WRK","WST","WU","WY","WYNN","XEL","XLNX","XOM",
    "XRAY","XYL","YUM","ZBH","ZBRA","ZION","ZTS",
    # Additional mid/small cap
    "ACHC","ACM","ADNT","AGCO","AIT","AMKR","AMSF","ANF","AOSL","ARC","ARW",
    "ASH","ATR","BCO","BECN","BHF","BIOL","BJRI","BJ","BOOT","BRC","BRKR",
    "CABO","CBT","CDAY","CFLT","CHE","CHGG","CHRD","CLB","COTY","CPT","CRI",
    "CRK","CW","CWT","DAN","DCI","DINO","DKNG","DLX","DNOW","DPH","DRH",
    "EAT","ENPH","ENS","ENV","EPC","EPD","ESE","ESPR","EXP","FELE","FLO","FLS",
    "FNB","FOXF","FR","FRPT","FULT","GFF","GGG","GHC","GNTX","GPI","GXO","HAE",
    "HBI","HCC","HCI","HGV","HIW","HLF","HMSY","HNI","HP","HRC","HRI","HRB",
    "HTLD","HUBB","HXL","IBOC","ICFI","IDCC","IDA","IMAX","INDB","INGR","IPGP",
    "ITRI","JBL","JCOM","JEF","JELD","JHG","JLL","KBH","KFY","KMT","KNX","KRC",
    "KSS","LANC","LEVI","LGIH","LNN","LPSN","LRN","LSTR","LTC","MASI","MCY",
    "MDCO","MED","MGEE","MHO","MIDD","MMS","MMSI","MOG.A","MPAA","MSA","MTRN",
    "MTX","NATI","NBR","NDSN","NFG","NHI","NMIH","NNN","NOVT","NPO","NRC",
    "NSP","NUS","NVT","OII","OLN","OLLI","ORI","OSIS","OZK","PDCO","PENN",
    "PII","PINC","PIPR","PLNT","PLUS","POWI","PRGO","PRGS","PRG","PSN","PTEN",
    "PUMP","R","RBC","RDN","REXR","RGP","RLI","RLJ","RPM","RXN","SASR","SCI",
    "SEIC","SF","SFM","SIGI","SJW","SKT","SLGN","SLM","SM","SMCI","SMAR",
    "SMBK","SMG","SMP","SNDR","SPSC","SR","STC","STEP","STRA","SUM","SXT",
    "TBBK","TCBK","TDS","TFIN","TGNA","THG","TILE","TNDM","TOWN","TPH","TPVG",
    "TREX","TRMK","TRN","TWNK","TYG","UE","UFI","UFPI","UGI","UMBF","UMPQ",
    "UNFI","UNF","UNIT","UONE","UPLD","URBN","USFD","USPH","VCNX","VFC","VIAV",
    "VIRT","VLY","VNET","VPG","VVI","WAFD","WBS","WEN","WERN","WGO","WK","WKC",
    "WMS","WOR","WPC","WRLD","WS","WTFC","WWD","XHR","XNCR","YORW",
]

FIELDS = [
    'symbol', 'longName', 'sector', 'industry', 'marketCap', 'currentPrice',
    'trailingPE', 'priceToSalesTrailing12Months', 'priceToBook',
    'enterpriseToEbitda', 'debtToEquity', 'returnOnEquity',
    'dividendYield', 'freeCashflow', 'marketCap',
]


def fetch_stock(ticker):
    try:
        info = yf.Ticker(ticker).info
        market_cap = info.get('marketCap') or 0
        if market_cap < 300_000_000:
            return None

        price = info.get('currentPrice') or info.get('regularMarketPrice')
        free_cash_flow = info.get('freeCashflow')
        shares = info.get('sharesOutstanding')

        # Price to Free Cash Flow
        p_fcf = None
        if free_cash_flow and shares and shares > 0 and price:
            fcf_per_share = free_cash_flow / shares
            if fcf_per_share > 0:
                p_fcf = price / fcf_per_share

        return {
            'symbol': ticker,
            'name': info.get('longName') or info.get('shortName') or ticker,
            'sector': info.get('sector') or 'Unknown',
            'industry': info.get('industry') or '',
            'marketCap': market_cap,
            'price': price,
            'peRatio': info.get('trailingPE'),
            'psRatio': info.get('priceToSalesTrailing12Months'),
            'pbRatio': info.get('priceToBook'),
            'evEbitda': info.get('enterpriseToEbitda'),
            'debtEquity': (info.get('debtToEquity') or 0) / 100 if info.get('debtToEquity') else None,
            'roe': info.get('returnOnEquity'),
            'dividendYield': info.get('dividendYield'),
            'pFcf': p_fcf,
        }
    except Exception as e:
        print(f"  Error fetching {ticker}: {e}")
        return None


def main():
    print(f"Fetching data for {len(TICKERS)} tickers...")
    stocks = []
    errors = 0

    for i, ticker in enumerate(TICKERS):
        print(f"[{i+1}/{len(TICKERS)}] {ticker}", end=' ')
        result = fetch_stock(ticker)
        if result:
            stocks.append(result)
            print(f"✓ ({result['sector']}, mktcap=${result['marketCap']/1e9:.1f}B)")
        else:
            errors += 1
            print("skipped")

        # Be polite to Yahoo Finance — avoid rate limiting
        if (i + 1) % 10 == 0:
            time.sleep(1)

    output = {
        'lastUpdated': datetime.now(timezone.utc).isoformat(),
        'count': len(stocks),
        'stocks': stocks,
    }

    out_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'stocks.json')
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    with open(out_path, 'w') as f:
        json.dump(output, f)

    print(f"\nDone. {len(stocks)} stocks saved, {errors} skipped.")
    print(f"Output: {os.path.abspath(out_path)}")


if __name__ == '__main__':
    main()
