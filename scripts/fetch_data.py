"""
Fetches value metrics for US-listed stocks with market cap > $300M using yfinance.
Also fetches top 10 cash-secured put options from highest-scored value stocks.
Outputs public/data/stocks.json and public/data/options.json
"""

import json
import time
import os
from datetime import datetime, timezone, date

import yfinance as yf

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


def compute_value_score(stock, peers):
    """Replicate the JS scoring logic in Python so we can rank stocks for options."""
    metrics = [
        ('evEbitda',   0.25, True),
        ('pFcf',       0.20, True),
        ('peRatio',    0.20, True),
        ('psRatio',    0.15, True),
        ('pbRatio',    0.10, True),
        ('debtEquity', 0.10, True),
    ]
    total_weight = 0
    weighted = 0
    for key, weight, lower_is_better in metrics:
        value = stock.get(key)
        if not value or value <= 0:
            continue
        peer_vals = sorted([p[key] for p in peers if p.get(key) and p[key] > 0])
        if len(peer_vals) < 2:
            continue
        rank = sum(1 for v in peer_vals if v < value)
        pct = rank / (len(peer_vals) - 1)
        if lower_is_better:
            pct = 1 - pct
        weighted += pct * weight
        total_weight += weight
    if total_weight == 0:
        return None
    return round((weighted / total_weight) * 100)


def fetch_stock(ticker):
    try:
        info = yf.Ticker(ticker).info
        market_cap = info.get('marketCap') or 0
        if market_cap < 300_000_000:
            return None

        price = info.get('currentPrice') or info.get('regularMarketPrice')
        free_cash_flow = info.get('freeCashflow')
        shares = info.get('sharesOutstanding')

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


def fetch_options_for_stock(stock):
    """
    Find the best cash-secured put for a given stock.
    Criteria:
      - 21-45 days to expiration
      - Strike 3-12% below current price (OTM)
      - Bid > 0 (liquid)
      - Open interest > 50
    Ranks by annualized premium yield.
    """
    symbol = stock['symbol']
    price = stock.get('price')
    if not price or price <= 0:
        return None

    try:
        ticker = yf.Ticker(symbol)
        expirations = ticker.options
        if not expirations:
            return None

        today = date.today()
        candidates = []

        for exp_str in expirations:
            exp_date = date.fromisoformat(exp_str)
            dte = (exp_date - today).days
            if dte < 21 or dte > 45:
                continue

            try:
                chain = ticker.option_chain(exp_str)
                puts = chain.puts
            except Exception:
                continue

            for _, row in puts.iterrows():
                strike = row.get('strike', 0)
                bid = row.get('bid', 0)
                oi = row.get('openInterest', 0) or 0
                iv = row.get('impliedVolatility', 0) or 0

                if not strike or not bid or bid <= 0:
                    continue
                if oi < 50:
                    continue

                # Strike must be 3-12% below current price
                pct_otm = (price - strike) / price
                if pct_otm < 0.03 or pct_otm > 0.12:
                    continue

                # Annualized yield = (bid / strike) * (365 / dte)
                ann_yield = (bid / strike) * (365 / dte)
                break_even = strike - bid

                candidates.append({
                    'symbol': symbol,
                    'name': stock['name'],
                    'sector': stock['sector'],
                    'valueScore': stock.get('valueScore'),
                    'stockPrice': round(price, 2),
                    'strike': strike,
                    'expiry': exp_str,
                    'dte': dte,
                    'bid': round(bid, 2),
                    'openInterest': int(oi),
                    'impliedVolatility': round(iv * 100, 1),
                    'annualizedYield': round(ann_yield * 100, 1),
                    'breakEven': round(break_even, 2),
                    'pctOtm': round(pct_otm * 100, 1),
                })

        if not candidates:
            return None

        # Best = highest annualized yield
        return max(candidates, key=lambda x: x['annualizedYield'])

    except Exception as e:
        print(f"  Options error {symbol}: {e}")
        return None


def main():
    print(f"Fetching stock data for {len(TICKERS)} tickers...")
    stocks = []

    for i, ticker in enumerate(TICKERS):
        print(f"[{i+1}/{len(TICKERS)}] {ticker}", end=' ')
        result = fetch_stock(ticker)
        if result:
            stocks.append(result)
            print(f"✓ ({result['sector']}, ${result['marketCap']/1e9:.1f}B)")
        else:
            print("skipped")
        if (i + 1) % 10 == 0:
            time.sleep(1)

    # Compute value scores
    sectors = {}
    for s in stocks:
        sectors.setdefault(s['sector'], []).append(s)

    for stock in stocks:
        peers = sectors.get(stock['sector'], stocks)
        stock['valueScore'] = compute_value_score(stock, peers)

    # Save stocks.json
    stocks_output = {
        'lastUpdated': datetime.now(timezone.utc).isoformat(),
        'count': len(stocks),
        'stocks': stocks,
    }
    base = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')
    os.makedirs(base, exist_ok=True)

    with open(os.path.join(base, 'stocks.json'), 'w') as f:
        json.dump(stocks_output, f)
    print(f"\nStocks done: {len(stocks)} saved.")

    # Fetch options for top 40 value-scored stocks
    scored = sorted(
        [s for s in stocks if s.get('valueScore') is not None],
        key=lambda x: x['valueScore'],
        reverse=True
    )[:40]

    print(f"\nFetching options for top {len(scored)} value stocks...")
    options = []
    for i, stock in enumerate(scored):
        print(f"[{i+1}/{len(scored)}] {stock['symbol']} (score={stock['valueScore']})", end=' ')
        result = fetch_options_for_stock(stock)
        if result:
            options.append(result)
            print(f"✓ strike=${result['strike']} exp={result['expiry']} yield={result['annualizedYield']}%")
        else:
            print("no qualifying options")
        time.sleep(0.5)

    # Sort by composite: weight annualized yield + value score
    def option_rank(o):
        score = o.get('valueScore') or 0
        yield_ = o.get('annualizedYield') or 0
        return (score / 100) * 0.4 + (min(yield_, 100) / 100) * 0.6

    top10 = sorted(options, key=option_rank, reverse=True)[:10]

    options_output = {
        'lastUpdated': datetime.now(timezone.utc).isoformat(),
        'strategy': 'cash-secured-puts',
        'options': top10,
    }

    with open(os.path.join(base, 'options.json'), 'w') as f:
        json.dump(options_output, f)

    print(f"\nOptions done: {len(top10)} top picks saved.")


if __name__ == '__main__':
    main()
