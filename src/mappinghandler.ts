import { CSGOTraderMapping, HistoryData, ListingData } from './@typings/FloatTypes';

// maps buff_name to buff_id
let buffMapping: { [name: string]: number } = {};
// maps buff_name to prices and more - from csgotrader
//let priceMapping: { [name: string]: any } = {};
let priceMapping: CSGOTraderMapping = {};
// cached items from api
let cachedItems: ListingData[] = [];
// history for one item
let cachedHistory: HistoryData[] = [];
let cachedInventoryHelperResponses: { [buff_name: string]: SteaminventoryhelperResponse | null } = {};

export async function cacheHistory(data: HistoryData[]) {
    if (cachedHistory.length > 0) {
        console.debug('[BetterFloat] History already cached, deleting history: ', cachedHistory);
        cachedHistory = [];
    }
    // original price is in cents, convert to dollars
    cachedHistory = data.map((history) => {
        return {
            avg_price: history.avg_price / 100,
            count: history.count,
            day: history.day,
        };
    });
}

export async function cacheItems(data: ListingData[]) {
    if (cachedItems.length > 0) {
        console.debug('[BetterFloat] Items already cached, deleting items: ', cachedItems);
        cachedItems = [];
    }
    cachedItems = data;
}

export async function getWholeHistory() {
    let history = cachedHistory;
    cachedHistory = [];
    return history;
}

export async function getFirstCachedItem() {
    if (cachedItems.length > 0) {
        const item = cachedItems.shift();
        return item;
    } else {
        return null;
    }
}

export async function getPriceMapping(): Promise<{ [key: string]: any }> {
    if (Object.keys(priceMapping).length == 0) {
        await loadMapping();
    }
    return priceMapping;
}

export async function getItemPrice(buff_name: string): Promise<{ starting_at: number; highest_order: number }> {
    if (Object.keys(priceMapping).length == 0) {
        await loadMapping();
    }
    //removing double spaces
    buff_name = handleSpecialStickerNames(buff_name.replace(/\s+/g, ' '));
    if (!priceMapping[buff_name] || !priceMapping[buff_name]['buff163'] || !priceMapping[buff_name]['buff163']['starting_at'] || !priceMapping[buff_name]['buff163']['highest_order']) {
        console.log(`[BetterFloat] No price mapping found for ${buff_name}`);
        let helperPrice = await getInventoryHelperPrice(buff_name);
        if (helperPrice) {
            return {
                starting_at: helperPrice,
                highest_order: helperPrice,
            };
        } else {
            return {
                starting_at: 0,
                highest_order: 0,
            };
        }
    }
    return {
        starting_at: priceMapping[buff_name]['buff163']['starting_at']['price'] ?? 0,
        highest_order: priceMapping[buff_name]['buff163']['highest_order']['price'] ?? 0,
    };
}

export function handleSpecialStickerNames(name: string): string {
    if (name.includes('Ninjas in Pyjamas | Katowice 2015')) {
        return 'Sticker | Ninjas in Pyjamas  | Katowice 2015';
    } else if (name.includes('Vox Eminor | Katowice 2015')) {
        return 'Sticker | Vox Eminor  | Katowice 2015';
    } else if (name.includes('PENTA Sports | Katowice 2015')) {
        return 'Sticker | PENTA Sports  | Katowice 2015';
    } else if (name.indexOf('niko') > -1) {
        return name.substring(0, name.lastIndexOf('|')) + ' ' + name.substring(name.lastIndexOf('|'), name.length);
    }
    return name;
}

type SIHRelay = {
    name: string;
    data: SteaminventoryhelperResponse;
    strategy: string;
    time: string;
};

type SteaminventoryhelperResponse = {
    success: boolean;
    items: {
        [key: string]: {
            buff163: {
                price: number;
                count: number;
            };
        };
    };
};

// Currently using my own server to relay requests to steaminventoryhelper due to their CORS policy
// For security reasons, I cannot share my whole server code, but the relevant endpoint is here:
// https://gist.github.com/GODrums/5b2d24c17c136a1b37acd14b1089933c
export async function getInventoryHelperPrice(buff_name: string): Promise<number | null> {
    if (cachedInventoryHelperResponses[buff_name]) {
        console.log(`[BetterFloat] Returning cached steaminventoryhelper response for ${buff_name}: `, cachedInventoryHelperResponses[buff_name]);
        return cachedInventoryHelperResponses[buff_name]?.items[buff_name]?.buff163?.price ?? null;
    }
    console.log(`[BetterFloat] Attempting to get price for ${buff_name} from steaminventoryhelper`);
    return await fetch('https://api.rums.dev/sih/'+encodeURI(buff_name)).then((response) => response.json()).then((response: SIHRelay) => {
        console.log(`[BetterFloat] Steaminventoryhelper response for ${buff_name}: `, response);
        if (response.data) {
            cachedInventoryHelperResponses[buff_name] = response.data;
        }
        return response.data?.items[buff_name]?.buff163?.price;
    }).catch((err) => {
        console.error(err);
        return null;
    });
}

export async function getBuffMapping(name: string) {
    if (Object.keys(buffMapping).length == 0) {
        await loadBuffMapping();
    }
    if (buffMapping[name]) {
        return buffMapping[name];
    } else {
        console.log(`[BetterFloat] No buff mapping found for ${name}`);
        return 0;
    }
}

export async function loadMapping() {
    if (Object.keys(priceMapping).length == 0) {
        console.debug('[BetterFloat] Attempting to load price mapping from local storage');

        let mapping: string | null = null;

        chrome.storage.local.get('prices', (data) => {
            if (data) {
                mapping = data.prices;
            } else {
                mapping = '';
            }
        });

        // since chrome.storage.local.get is async, we might need to wait for it to finish
        let tries = 20;
        while (mapping == null && tries-- > 0) {
            await new Promise((r) => setTimeout(r, 100));
        }

        if (tries == 0) {
            console.debug('[BetterFloat] Did not receive a response from Csgotrader.');
            mapping = '';
            priceMapping = {};
        }

        if (mapping != null && mapping.length > 0) {
            priceMapping = JSON.parse(mapping);
        } else {
            console.debug('[BetterFloat] Failed. Loading price mapping from file is currently disabled.');
            return false;
            // fallback to loading older prices from file currently disabled
            // console.debug('[BetterFloat] Failed. Loading price mapping from file.');
            // let response = await fetch(runtimePublicURL + '/prices_v6.json');
            // priceMapping = await response.json();
        }
        console.debug('[BetterFloat] Price mapping successfully initialized');
    }
    return true;
}

// get mapping from rums.dev
// currently has no fallback if api is down
export async function loadBuffMapping() {
    console.debug('[BetterFloat] Attempting to load buff mapping from rums.dev');
    await fetch('https://api.rums.dev/file/buff_name_to_id')
        .then((response) => response.json())
        .then((data) => {
            buffMapping = data;
            console.debug('[BetterFloat] Buff mapping successfully loaded from rums.dev');
        })
        .catch((err) => console.error(err));
}
