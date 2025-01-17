export function genRefreshButton(name: 'Start' | 'Stop'): HTMLDivElement {
    const element = document.createElement('div');
    element.classList.add('betterfloat-refresh' + name.toString());
    element.textContent = name.toString();
    return element;
}

export function generateSpStickerContainer(priceSum: number, spPercentage: number, isItemPage = false) {
    const outerContainer = document.createElement('div');
    const spContainer = document.createElement('span');
    spContainer.classList.add('betterfloat-sticker-price');
    let backgroundImageColor = '';
    if (spPercentage < 0.005 || spPercentage > 2) {
        backgroundImageColor = 'black';
    } else if (spPercentage > 1) {
        backgroundImageColor = 'rgba(245,0,0,1)';
    } else if (spPercentage > 0.5) {
        backgroundImageColor = 'rgba(245,164,0,1)';
    } else if (spPercentage > 0.25) {
        backgroundImageColor = 'rgba(244,245,0,1)';
    } else {
        backgroundImageColor = 'rgba(83,245,0,1)';
    }
    spContainer.style.backgroundImage = `linear-gradient(135deg, ${backgroundImageColor}, rgb(0, 115, 213))`;
    spContainer.style.color = 'white';
    spContainer.style.fontWeight = '600';
    spContainer.style.borderRadius = '7px';
    // if SP is above 200% or below 0.5% display SP in $, otherwise in %
    if (spPercentage > 2 || spPercentage < 0.005) {
        spContainer.textContent = `SP: $${priceSum.toFixed(0)}`;
    } else {
        spContainer.textContent = `SP: ${(spPercentage > 0 ? spPercentage * 100 : 0).toFixed(1)}%`;
    }
    if (isItemPage) {
        outerContainer.style.margin = '25px 0 10px 10px';
        spContainer.style.padding = '5px 10px';
    } else {
        spContainer.style.padding = '2px 5px';
        outerContainer.style.position = 'absolute';
        outerContainer.style.top = '135px';
        outerContainer.style.left = '10px';
        outerContainer.style.margin = '0 0 10px 10px';
    }
    outerContainer.appendChild(spContainer);
    return outerContainer;
}
