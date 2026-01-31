// Copyright (c) 2021-2026 Stuart Garner
// Licensed under the MIT License: https://github.com/antarcticduck/admin-hub/blob/main/LICENSE

const fetchUrlSuffix = 'v2026.04';
const monthNames = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ];
const pinnedSidebarMinimumWidth = 1412;
const regexSpecialCharacters = /[.*+?^${}()|[\]\\]/g;
const searchMinimumHeight = 300;

let currentListViewSortColumn;
let currentListViewSortDirection;
let fetchLiveDataOnNextClockTick = false;
let isLocalStorageAccessible = false;
let listViewColumnsLastForceVisibility = true;
let listViewColumnVisibilityWidths = [];
let listViewCustomColumns = [];
let rssFeedFileAge;
let rssFeedLinkCreated = false;
let sitesFileAge;
let statisticsFileAge;
let tileContainerCount = 0;
let wasLiveDataFetched = false;

// Main elements
const bodyContainer = document.querySelector('.body-container');
const content = document.querySelector('.content');
const contentHeaderContainerEffect = document.querySelector('.content__header-container-effect');
const header = document.querySelector('.header');
const hyperlinkPopups = document.getElementsByClassName('hyperlink-popup'); // live list of elements
const sidebar = document.querySelector('.sidebar');

// Dialogs
const aboutDialog = document.querySelector('.about-dialog');
const detailsDialog = document.getElementsByClassName('details-dialog'); // live list of elements

// Tiles
const dashboardViewGroupContainerStatistics = document.querySelector('#dashboardViewGroupContainerStatistics');
const dashboardViewGroupContainerPinned = document.querySelector('#dashboardViewGroupContainerPinned');
const dashboardViewTileContainerPinned = document.querySelector('#dashboardViewTileContainerPinned');
const dashboardViewTileContainers = document.getElementsByClassName('dashboard-view__tile-container'); // live list of elements
const tiles = document.getElementsByClassName('tile'); // live list of elements

// List view
const listViewTable = document.querySelector('.list-view-table');
const listViewTableBody = listViewTable.querySelector('tbody');
const listViewTableCells = listViewTableBody.getElementsByTagName('td'); // live list of elements
const listViewTableColumns = listViewTable.querySelector('colgroup');
const listViewTableHead = listViewTable.querySelector('thead');
const listViewTableHeaders = listViewTableHead.getElementsByTagName('th'); // live list of elements
const listViewTableRows = listViewTableBody.getElementsByTagName('tr'); // live list of elements

// Sidebar expander button
const contentSidebarExpanderContainer = document.querySelector('.content__sidebar-expander-container');

// Status box
const contentStatusIndicator = document.querySelector('#contentStatusIndicator');
const contentStatusText = document.querySelector('.content__status-text');

// Search bar
const contentSearchInput = document.querySelector('#contentSearchInput');
const contentSearchCloseButtonContainer = document.querySelector('.content__search-close-button-container');
const contentSearchCloseButton = document.querySelector('.content__search-close-button');
const contentSearchCaptionText = document.querySelector('.content__search-caption-text');

// Theme toggle button
const contentThemeToggleContainer = document.querySelector('.content__theme-toggle-container');

// View toggle button
const contentViewToggleContainer = document.querySelector('.content__view-toggle-container');

// RSS feed popup
const contentRssFeedContainer = document.querySelector('.content__rss-feed-container');

// Accessibility popup
const contentAccessibilityContainer = document.querySelector('.content__accessibility-container');
const settingsPopupAccessibilityBordersCheckbox = document.querySelector('#settingsPopupAccessibilityBordersCheckbox');
const settingsPopupAccessibilityNoTransparencyCheckbox = document.querySelector('#settingsPopupAccessibilityNoTransparencyCheckbox');

// Settings popup
const contentSettingsContainer = document.querySelector('.content__settings-container');
const settingsPopupPinSidebarCheckbox = document.querySelector('#settingsPopupPinSidebarCheckbox');
const settingsPopupShowThemeToggleCheckbox = document.querySelector('#settingsPopupShowThemeToggleCheckbox');
const settingsPopupShowViewToggleCheckbox = document.querySelector('#settingsPopupShowViewToggleCheckbox');
const settingsPopupShowRssFeedCheckbox = document.querySelector('#settingsPopupShowRssFeedCheckbox');
const settingsPopupShowClockCheckbox = document.querySelector('#settingsPopupShowClockCheckbox');
const settingsPopupShowStatisticsCheckbox = document.querySelector('#settingsPopupShowStatisticsCheckbox');
const settingsPopupSortByIDRadioButton = document.querySelector('#settingsPopupSortByIDRadioButton');
const settingsPopupSortByNameRadioButton = document.querySelector('#settingsPopupSortByNameRadioButton');
const settingsPopupSortByStatusRadioButton = document.querySelector('#settingsPopupSortByStatusRadioButton');
const settingsPopupAutomaticallyUpdateDataCheckbox = document.querySelector('#settingsPopupAutomaticallyUpdateDataCheckbox');

// Clock popup
const contentClockContainer = document.querySelector('.content__clock-container');
const contentClockButtonTimeText = document.querySelector('.content__clock-button-time-text');
const contentClockButtonDateText = document.querySelector('.content__clock-button-date-text');
const clockPopupItemTimeText = document.getElementsByClassName('clock-popup__item-time-text'); // live list of elements

// We'll add an event listener for the window load event.
window.addEventListener('load', window_LoadEvent);



// #region General Functions

// Debounce function (used to rate limit the number of times an event listener calls another function).
function debounce(func, delay) {
    let debounceTimer;
    return function(...args) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(this, args), delay);
    };
}

// Function to calculate when columns in the list view table should be hidden (based on the width of the content pane).
function getListViewColumnVisibilityWidths() {

    if (!content.classList.contains('content--list-view')) {
        return;
    }

    listViewColumnVisibilityWidths = [];

    const columns = listViewTableColumns.querySelectorAll('col');
    if (columns.length === 0) {
        return;
    }

    // We'll temporarily set the content pane's width to 0px so that we can determine the smallest width each column can be.
    content.style.width = '0';
    const listViewTableStyle = window.getComputedStyle(listViewTable);
    const listViewTableMargins = (parseFloat(listViewTableStyle.marginLeft) + parseFloat(listViewTableStyle.marginRight));
    let listViewColumnWidths = [];
    for (let i = 0; i < columns.length; i++) {
        listViewColumnWidths.push(columns[i].offsetWidth);
    }

    // We'll reset the content pane's width.
    content.style.width = '';

    // We'll create a variable to track the minimum width the content pane can be for a column to be visible to the user.
    // The first and last column should always be visible so we'll add these values to the list view table's margin to get our initial value.
    let currentVisibilityWidth = listViewTableMargins + listViewColumnWidths[0] + listViewColumnWidths[listViewColumnWidths.length - 1];

    for (let i = 0; i < listViewColumnWidths.length; i++) {

        // The first and last column should always be visible (so we'll set the minimum content pane width to 0px).
        if (i === 0 || i === (listViewColumnWidths.length - 1)) {
            listViewColumnVisibilityWidths.push(0);
            continue;
        }

        // We'll set the minimum width the content pane can be for this column to be visible.
        currentVisibilityWidth += listViewColumnWidths[i];
        listViewColumnVisibilityWidths.push(currentVisibilityWidth);

    }

}

// Function to pin a tile to the 'My Pins' tile container.
function pinTile(siteID, isOnWindowLoad = false) {

    const tileToPin = document.querySelector(`.tile[data-siteid="${siteID}"]`);
    if (tileToPin === null || tileToPin.classList.contains('tile--pinned')) {
        return;
    }

    dashboardViewTileContainerPinned.appendChild(tileToPin);
    tileToPin.classList.add('tile--pinned');
    tileToPin.querySelector('.tile__pin-button').setAttribute('data-tooltip', 'Unpin site');

    if (!isOnWindowLoad) {
        content.scrollTo({ top: 0, behavior: 'smooth' });
        sortTiles(isLocalStorageAccessible ? window.localStorage.getItem('SortBy') : 'data-siteid');
        setTileContainerResponsiveUI();
        savePinnedTilesToLocalStorage();
    }

}

// Function to unpin a tile from the 'My Pins' tile container.
function unpinTile(siteID) {

    const tileToUnpin = document.querySelector(`.tile[data-siteid="${siteID}"]`);
    if (tileToUnpin === null || !tileToUnpin.classList.contains('tile--pinned')) {
        return;
    }

    const tileContainer = document.querySelector(`#${tileToUnpin.getAttribute('data-tilecontainer')}`);
    tileContainer.appendChild(tileToUnpin);
    tileToUnpin.classList.remove('tile--pinned');
    tileToUnpin.querySelector('.tile__pin-button').setAttribute('data-tooltip', 'Pin site');

    sortTiles(isLocalStorageAccessible ? window.localStorage.getItem('SortBy') : 'data-siteid');
    setTileContainerResponsiveUI();
    savePinnedTilesToLocalStorage();

}

// Function to save the pinned tiles to local storage.
function savePinnedTilesToLocalStorage() {

    if (!isLocalStorageAccessible) {
        return;
    }

    const pinnedTiles = document.querySelectorAll('.tile--pinned');
    let pinnedTilesToSave = []

    // We'll loop through each pinned tile and add it to the array that will be saved to local storage.
    for (let i = 0; i < pinnedTiles.length; i++) {
        const pinnedTileID = pinnedTiles[i].getAttribute('data-siteid');
        if (typeof pinnedTileID === 'string' && pinnedTileID.length > 0) {
            pinnedTilesToSave.push(pinnedTileID);
        }
    }

    window.localStorage.setItem('PinnedSites', JSON.stringify(pinnedTilesToSave));

}

// Function to filter and highlight matching terms in the details dialog.
function searchDetailsDialog(element) {

    const filter = element.value.toUpperCase().replace(regexSpecialCharacters, '\\$&');
    const filterRegEx = new RegExp(filter, 'gi');
    const detailsDialogContentContainer = element.parentNode.parentNode.parentNode;
    const details = detailsDialogContentContainer.querySelectorAll('details');
    const detailsDialogPlaceholderText = detailsDialogContentContainer.querySelector('.details-dialog__search-placeholder-text');

    let isDetailsVisible = false;

    // We'll loop through each expander in the details dialog.
    for (let i = 0; i < details.length; i++) {

        const summary = details[i].querySelector('summary');
        const tableRows = details[i].querySelectorAll('tr');
        const tableCells = details[i].querySelectorAll('td');

        // We expand all of the expanders when searching.
        details[i].setAttribute('open', true);

        // We'll show everything under an expander if the expander's header contains the search term (or if nothing is being searched).
        if (filter.length === 0 || summary.innerText.toUpperCase().includes(filter)) {

            for (let i = 0; i < tableRows.length; i++) {
                tableRows[i].style.display = '';
            }

            details[i].style.display = '';
            isDetailsVisible = true;

        } else {

            let isTableRowVisible = false;

            // We'll hide any rows that don't match the search term.
            for (let i = 0; i < tableRows.length; i++) {
                if (tableRows[i].innerText.toUpperCase().includes(filter)) {
                    tableRows[i].style.display = '';
                    isTableRowVisible = true;
                } else {
                    tableRows[i].style.display = 'none';
                }
            }

            // We'll hide the expander if nothing matched the search term.
            if (isTableRowVisible) {
                details[i].style.display = '';
                isDetailsVisible = true;
            } else {
                details[i].style.display = 'none';
            }

        }

        // We'll use <mark> tags to highlight any matching text in the expander's header.
        let newSummaryInnerHtml = summary.innerHTML;
        newSummaryInnerHtml = newSummaryInnerHtml.replace(/(<mark>|<\/mark>)/gim, '');
        if (filter.length !== 0) {
            newSummaryInnerHtml = newSummaryInnerHtml.replace(filterRegEx, '<mark>$&</mark>');
        }
        summary.innerHTML = newSummaryInnerHtml;

        // We'll use <mark> tags to highlight any matching text in the table.
        for (let i = 0; i < tableCells.length; i++) {
            let newTableCellInnerHtml = tableCells[i].innerHTML;
            newTableCellInnerHtml = newTableCellInnerHtml.replace(/(<mark>|<\/mark>)/gim, '');
            if (filter.length !== 0) {
                newTableCellInnerHtml = newTableCellInnerHtml.replace(filterRegEx, '<mark>$&</mark>');
            }
            tableCells[i].innerHTML = newTableCellInnerHtml;
        }

    }

    // We'll show the placeholder text if nothing matched the search term (and none of the expanders are visible).
    if (isDetailsVisible) {
        detailsDialogPlaceholderText.style.display = '';
    } else {
        detailsDialogPlaceholderText.style.display = 'block';
    }

    detailsDialogContentContainer.scrollTop = 0;

}

// Function to filter table rows in list view.
function searchList() {

    const filter = contentSearchInput.value.toUpperCase().replace(regexSpecialCharacters, '\\$&');
    const filterRegEx = new RegExp(filter, 'gi');

    if (filter.length === 0) {

        // If nothing is being searched we'll make sure all of the rows are visible again.
        for (let i = 0; i < listViewTableRows.length; i++) {
            listViewTableRows[i].style.display = '';
        }

        content.classList.remove('content--list-view-search-mode');
        contentSearchCloseButtonContainer.classList.add('content__button-container--hidden');
        contentSearchCaptionText.innerHTML = '';

    } else {

        let visibleRowCount = 0;

        for (let i = 0; i < listViewTableRows.length; i++) {

            // If the search text is included in a row's data attributes, we'll show the row (otherwise we'll hide it).
            const attributesToSearch = Object.entries(listViewTableRows[i].dataset);
            if (Object.values(attributesToSearch).some(([_, value]) => value.toUpperCase().includes(filter))) {
                listViewTableRows[i].style.display = '';
                visibleRowCount++;
            } else {
                listViewTableRows[i].style.display = 'none';
            }

        }

        content.classList.add('content--list-view-search-mode');
        contentSearchCloseButtonContainer.classList.remove('content__button-container--hidden');

        // We'll show the user how many rows have been filtered.
        contentSearchCaptionText.innerHTML = ('Showing: <b>' + visibleRowCount.toString() + '</b> of <b>' + listViewTableRows.length.toString() + '</b>');

    }

    for (let i = 0; i < listViewTableCells.length; i++) {

        // We'll make sure the text in the table cell is neither '' nor equal to '-' (which we use in the UI to represent an empty field).
        if (listViewTableCells[i].innerText.trim() === '' || listViewTableCells[i].innerText === '-') {
            continue;
        }

        let newTableCellInnerHtml = listViewTableCells[i].innerHTML;
        newTableCellInnerHtml = newTableCellInnerHtml.replace(/(<mark>|<\/mark>)/gim, '');

        // We'll use <mark> tags to highlight any matching text in the cell.
        // Before adding the tags, we'll check that the cell's text is exactly the same as its HTML.
        // If its not, it indicates that there are other child elements in the table cell and we don't want to manipulate the raw HTML as we could break the UI.
        if (filter.length !== 0 && newTableCellInnerHtml === listViewTableCells[i].innerText) {
            newTableCellInnerHtml = newTableCellInnerHtml.replace(filterRegEx, '<mark>$&</mark>');
        }
        listViewTableCells[i].innerHTML = newTableCellInnerHtml;

    }

    content.scrollTop = 0;

}

// Function to filter the tiles in dashboard view.
function searchTiles() {

    const filter = contentSearchInput.value.toUpperCase();

    if (filter.length === 0) {

        // If nothing is being searched we'll make sure all of the tiles are visible again.
        for (let i = 0; i < tiles.length; i++) {
            tiles[i].classList.remove('tile--hidden-by-search');
        }

        sidebar.removeAttribute('inert');
        content.classList.remove('content--search-mode');
        contentSearchCloseButtonContainer.classList.add('content__button-container--hidden');
        contentSearchCaptionText.innerHTML = '';

    } else {

        let visibleTilesCount = 0;

        for (let i = 0; i < tiles.length; i++) {

            // We'll get all of the tile's data attributes (except for data-tilecontainer which we don't want to search).
            const attributesToSearch = Object.entries(tiles[i].dataset).filter(([key, _]) => key !== "tilecontainer");

            // We'll show the tile if the text the user typed in to the search box is found in any of the data attributes (otherwise we'll hide it).
            if (Object.values(attributesToSearch).some(([_, value]) => value.toUpperCase().includes(filter))) {
                tiles[i].classList.remove('tile--hidden-by-search');
                visibleTilesCount++;
            } else {
                tiles[i].classList.add('tile--hidden-by-search');
            }

        }

        sidebar.setAttribute('inert', true);
        content.classList.add('content--search-mode');
        contentSearchCloseButtonContainer.classList.remove('content__button-container--hidden');

        // We'll show the user how many tiles have been filtered.
        contentSearchCaptionText.innerHTML = ('Showing: <b>' + visibleTilesCount.toString() + '</b> of <b>' + tiles.length.toString() + '</b>');

    }

    content.scrollTop = 0;

}

// Function to set the colour theme.
function setColourTheme(colourTheme) {

    document.documentElement.setAttribute('colour-theme', colourTheme);

    if (colourTheme === 'dark-mode') {
        contentThemeToggleContainer.setAttribute('data-tooltip', 'Switch to light mode');
    } else {
        contentThemeToggleContainer.setAttribute('data-tooltip', 'Switch to dark mode');
    }

    if (isLocalStorageAccessible) {
        window.localStorage.setItem('ColourTheme', colourTheme);
    }

}

// Function to adjust the way columns in the list view table are displayed in response to resizing the window (called when the content pane is resized).
function setListViewTableResponsiveUI() {

    if (listViewColumnVisibilityWidths.length === 0) {
        return;
    }

    // If we're not in list view we'll force all of the columns to be visible (so that we're ready to re-calculate when the user next switches back to list view).
    let forceVisibility = !content.classList.contains('content--list-view');
    if (forceVisibility && listViewColumnsLastForceVisibility) {
        return;
    }
    listViewColumnsLastForceVisibility = forceVisibility;

    const contentWidth = content.offsetWidth;

    // We'll show or hide each column in the list view table based on whether the width of the content pane allows it (as calculated by getListViewColumnVisibilityWidths()).
    // If we're forcing visibility we'll show every column regardless of the above.
    for (let i = 0; i < listViewColumnVisibilityWidths.length; i++) {

        const column = listViewTable.querySelector(`col:nth-of-type(${i + 1})`);
        const header = listViewTable.querySelector(`th:nth-of-type(${i + 1})`);
        const cells = listViewTable.querySelectorAll(`td:nth-of-type(${i + 1})`);
        const displayValue = (forceVisibility || contentWidth >= listViewColumnVisibilityWidths[i]) ? '' : 'none';

        if (column !== null) {
            column.style.display = displayValue;
        }

        if (header !== null) {
            header.style.display = displayValue;
        }

        for (let j = 0; j < cells.length; j++) {
            cells[j].style.display = displayValue;
        }

    }

}

// Function to adjust the way the tile containers are displayed (called when a tile is being pinned or unpinned).
function setTileContainerResponsiveUI() {

    // Depending on whether or not there are any pinned tiles, we'll add or remove the class that makes the 'My Pins' group hidden.
    if (dashboardViewGroupContainerPinned.querySelectorAll('.tile').length > 0) {
        dashboardViewGroupContainerPinned.classList.remove('dashboard-view__group-container--hidden');
    } else if (!dashboardViewGroupContainerPinned.classList.contains('dashboard-view__group-container--hidden')) {
        dashboardViewGroupContainerPinned.classList.add('dashboard-view__group-container--hidden');
    }

    // We'll add placeholder messages to any tile containers that don't have tiles.
    for (let i = 0; i < dashboardViewTileContainers.length; i++) {
        const placeholderText = dashboardViewTileContainers[i].querySelector('.dashboard-view__placeholder-text')
        if (dashboardViewTileContainers[i].querySelectorAll('.tile').length === 0) {
            dashboardViewTileContainers[i].innerHTML = '<div class="dashboard-view__placeholder-text">There are no sites to show</div>';
        } else if (placeholderText !== null) {
            dashboardViewTileContainers[i].removeChild(placeholderText);
        }
    }

    if (content.classList.contains('content--search-mode')) {
        searchTiles();
    }

}

// Function to set the view.
function setView(view, isOnWindowLoad = false) {

    if (view === 'list-view') {
        content.classList.add('content--list-view');
        contentViewToggleContainer.setAttribute('data-tooltip', 'Switch to dashboard view');
    } else {
        content.classList.remove('content--list-view');
        contentViewToggleContainer.setAttribute('data-tooltip', 'Switch to list view');
    }

    if (!isOnWindowLoad) {
        getListViewColumnVisibilityWidths();
        setListViewTableResponsiveUI();
        contentSearchInput.value = '';
        if (view === 'list-view') {
            searchTiles();
        } else {
            searchList();
        }
    }

    content.scrollTop = 0;

    if (isLocalStorageAccessible) {
        window.localStorage.setItem('View', view);
    }

}

// Function to show the details dialog for a site.
async function showDetailsDialog(siteID, siteName, siteImage, siteDetails) {

    await closeDetailsDialog();

    // We'll create a new details dialog element.
    const detailsDialogTemplate = document.querySelector("#detailsDialogTemplate");
    const newDetailsDialog = document.importNode(detailsDialogTemplate.content, true);
    const newDetailsDialogElement = newDetailsDialog.querySelector('.details-dialog');
    newDetailsDialogElement.addEventListener('close', (event) => { detailsDialog_CloseEvent(event) }, { once: true });
    newDetailsDialogElement.addEventListener('keydown', detailsDialog_KeyDownEvent);
    newDetailsDialogElement.setAttribute('style', `top: ${(header.getBoundingClientRect().bottom + 12)}px`);
    newDetailsDialogElement.setAttribute('data-siteid', siteID);
    newDetailsDialog.querySelector('.details-dialog__image-wrapper').innerHTML = siteImage;
    newDetailsDialog.querySelector('.details-dialog__title-text').innerText = siteName;

    if (siteDetails) {

        const detailsDialogDisclosureTemplate = document.querySelector("#detailsDialogDisclosureTemplate");
        const siteDetailsJson = JSON.parse(siteDetails);

        for (let i = 0; i < siteDetailsJson.length; i++) {

            // We'll create a new disclosure element for this category of data (if its the first element we'll open it in the UI).
            const newDetailsDialogDisclosure = document.importNode(detailsDialogDisclosureTemplate.content, true);
            if (i === 0) {
                newDetailsDialogDisclosure.querySelector('details').setAttribute('open', true);
            }
            newDetailsDialogDisclosure.querySelector('summary').innerText = siteDetailsJson[i].Title;

            if (siteDetailsJson[i].Data.length > 0) {

                // We'll add a table row for each data item in the category.
                for (let j = 0; j < siteDetailsJson[i].Data.length; j++) {
                    const newTableRow = document.createElement('tr');
                    newTableRow.innerHTML = `
                        <td>${siteDetailsJson[i].Data[j].Key}:</td>
                        <td>${siteDetailsJson[i].Data[j].Value}</td>
                    `
                    newDetailsDialogDisclosure.querySelector('tbody').appendChild(newTableRow);
                }

                // We'll set the caption text if one is specified (otherwise we'll remove the element).
                if (siteDetailsJson[i].Caption) {
                    newDetailsDialogDisclosure.querySelector('.details-dialog__caption-text').innerText = siteDetailsJson[i].Caption;
                } else {
                    newDetailsDialogDisclosure.querySelector('.details-dialog__caption-text').remove();
                }

            } else {

                // We'll remove the table and set the caption text to show that no data is currently available.
                newDetailsDialogDisclosure.querySelector('table').remove();
                newDetailsDialogDisclosure.querySelector('.details-dialog__caption-text').innerText = 'No data currently available.';

            }

            newDetailsDialog.querySelector('.details-dialog__content-container').appendChild(newDetailsDialogDisclosure);

        }

        const detailsDialogSearchInputElement = newDetailsDialog.querySelector('.details-dialog__search-container > input');
        detailsDialogSearchInputElement.addEventListener('keyup', debounce((event) => { detailsDialogSearchInput_KeyUpEvent(event) }, 100));

        // We'll remove the placeholder text as we're showing data.
        newDetailsDialog.querySelector('.details-dialog__placeholder-text').remove();

    } else {

        // We'll remove the search input and the expand/collapse all button.
        newDetailsDialog.querySelector('.details-dialog__expand-all-button').remove();
        newDetailsDialog.querySelector('.details-dialog__search-container').remove();
        newDetailsDialog.querySelector('.details-dialog__search-placeholder-text').remove();

    }

    // We'll add the details dialog after the content pane element and show it as a modal.
    bodyContainer.appendChild(newDetailsDialog);
    newDetailsDialogElement.showModal();

}

// Function to close the details dialog.
async function closeDetailsDialog() {
    for (let i = (detailsDialog.length - 1); i >= 0; i--) {
        detailsDialog[i].close();
    }
}

// Function to sort an array of elements alphabetically/numerically by an attribute.
function sortArrayByAttribute(a, b, attribute, sendNullToEnd = false) {
    return sendNullToEnd && !a.getAttribute(attribute) ? 1
        : sendNullToEnd && !b.getAttribute(attribute) ? -1
        : a.getAttribute(attribute) < b.getAttribute(attribute) ? -1
        : a.getAttribute(attribute) > b.getAttribute(attribute) ? 1
        : 0;
}

// Function to sort the list of tiles alphabetically/numerically by an attribute.
function sortTiles(attribute) {

    for (let i = 0; i < dashboardViewTileContainers.length; i++) {

        // If we're not sorting by the site ID attribute, we'll sort by this first before sorting by the specified attribute.
        const tilesArray = Array.from(dashboardViewTileContainers[i].querySelectorAll('.tile'));

        if (attribute !== 'data-siteid') {
            tilesArray.sort(function (a, b) { return sortArrayByAttribute(a, b, 'data-siteid', true) });
        }

        tilesArray.sort(function (a, b) { return sortArrayByAttribute(a, b, attribute, true) });

        // We'll put the sorted tiles back in to their tile container.
        for (let j = 0; j < tilesArray.length; j++) {
            dashboardViewTileContainers[i].appendChild(tilesArray[j]);
        }

    }

    switch (attribute) {
        case 'data-sitename':
            settingsPopupSortByNameRadioButton.checked = true;
            break;
        case 'data-sitestatus':
            settingsPopupSortByStatusRadioButton.checked = true;
            break;
        default:
            settingsPopupSortByIDRadioButton.checked = true;
    }

    if (isLocalStorageAccessible) {
        window.localStorage.setItem('SortBy', attribute);
    }

}

// Function to sort the list view table alphabetically by column.
function sortListViewTable(column, direction) {

    // We'll remove the classes that show which column the rows are currently being sorted by (these classes add a little arrow at the end of the column header text).
    for (let i = 0; i < listViewTableHeaders.length; i++) {
        listViewTableHeaders[i].classList.remove('list-view-table__header--sort-ascending');
        listViewTableHeaders[i].classList.remove('list-view-table__header--sort-descending');
    }

    // We'll show the user which column is now being sorted.
    listViewTableHeaders[column].classList.add(`list-view-table__header--sort-${direction}`);

    // We'll sort the rows based on the 'data-sorttextcol<n>' attribute (where <n> is the column number).
    // We sort by the text in this attribute instead of just the cells' inner HTML (as there may be nested elements or images that have a special sort order).
    // If we're not sorting by column 1 (the ID), we'll sort by this first before sorting the specified column.
    const sortedRowsArray = Array.from(listViewTableRows);

    if (column !== '1') {
        sortedRowsArray.sort(function (a, b) { return sortArrayByAttribute(a, b, `data-sorttextcol1`, true) })
        if (direction === 'descending') {
            sortedRowsArray.reverse();
        }
    }

    sortedRowsArray.sort(function (a, b) { return sortArrayByAttribute(a, b, `data-sorttextcol${column}`, true) })
    if (direction === 'descending') {
        sortedRowsArray.reverse();
    }

    // We'll put the sorted rows back in to the table.
    for (let i = 0; i < sortedRowsArray.length; i++) {
        listViewTableBody.appendChild(sortedRowsArray[i]);
    }

    currentListViewSortColumn = column;
    currentListViewSortDirection = direction;

    if (isLocalStorageAccessible) {
        window.localStorage.setItem('ListViewSortColumn', column);
        window.localStorage.setItem('ListViewSortDirection', direction);
    }

}

// Function to update the time of the clocks displayed in the clocks popup.
async function updateClocks() {

    if (fetchLiveDataOnNextClockTick) {
        await fetchLiveData();
        fetchLiveDataOnNextClockTick = false;
    }

    const autoDataUpdate = (isLocalStorageAccessible ? localStorage.getItem('AutoDataUpdate') : 'true');
    const currentDateTime = new Date();
    contentStatusIndicator.classList = 'tag tag--indicator';

    if (!isNaN(Date.parse(sitesFileAge))) {

        // We'll calculate how many minutes have passed since the sites configuration file was last modified.
        const minutesSinceLastUpdate = Math.floor((currentDateTime - (new Date(sitesFileAge))) / 60000);

        // We'll determine the status icon and text that should be displayed in the UI.
        if (minutesSinceLastUpdate < 1) {
            contentStatusIndicator.classList.add('tag--green');
            contentStatusText.innerText = 'Data updated just now';
        } else if (minutesSinceLastUpdate < 15) {
            contentStatusIndicator.classList.add('tag--green');
            contentStatusText.innerText = `Data updated ${(minutesSinceLastUpdate === 1) ? '1 minute ago' : (minutesSinceLastUpdate.toString() + ' minutes ago')}`;
        } else if (autoDataUpdate === 'true') {
            contentStatusIndicator.classList.add('tag--red');
            contentStatusText.innerText = 'Data expired, waiting for updates...';
        } else {
            contentStatusIndicator.classList.add('tag--yellow');
            contentStatusText.innerText = 'Data expired, please refresh page';
        }

        // If its been more than 5 minutes since the last update we'll flag that we need to fetch live data on the next clock tick.
        if (autoDataUpdate === 'true' && minutesSinceLastUpdate > 5) {
            fetchLiveDataOnNextClockTick = true;
        }

    } else {

        contentStatusIndicator.classList.add('tag--red');
        contentStatusText.innerText = 'Error updating data';

        if (autoDataUpdate === 'true') {
            fetchLiveDataOnNextClockTick = true;
        }

    }

    // We'll show the current UTC date/time in the clock button.
    contentClockButtonTimeText.textContent = `${('0' + currentDateTime.getUTCHours()).slice(-2)}:${('0' + currentDateTime.getUTCMinutes()).slice(-2)} UTC`;
    contentClockButtonDateText.textContent = `${('0' + currentDateTime.getUTCDate()).slice(-2)} ${monthNames[currentDateTime.getUTCMonth()]} ${currentDateTime.getUTCFullYear()}`;

    // We'll loop through each clock item and update the time.
    for (let i = 0; i < clockPopupItemTimeText.length; i++) {

        let timeZoneDateTimeString;
        try {
            timeZoneDateTimeString = currentDateTime.toLocaleString('en-US', { timeZone: clockPopupItemTimeText[i].getAttribute('data-timezone') });
        } catch {
            continue;
        }

        const timeZoneDateTime = new Date(timeZoneDateTimeString);
        clockPopupItemTimeText[i].innerHTML = `${('0' + timeZoneDateTime.getHours()).slice(-2)}:${('0' + timeZoneDateTime.getMinutes()).slice(-2)}`;

    }

}

// #endregion General Functions



// #region Fetch Functions

// Function to fetch the branding information from the config file and update page elements.
function fetchBranding() {

    // We'll fetch then process the branding.json file (this file can be cached by the web browser).
    fetch(`configuration/branding.json?${fetchUrlSuffix}`)
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Unable to fetch the branding.json file');
    })
    .then(brandingJson => {

        // Set the webpage title.
        if (typeof brandingJson.WebsiteTitle === 'string' && brandingJson.WebsiteTitle.length > 0) {
            document.title = brandingJson.WebsiteTitle;
        }

        // Set the favicon.
        if (typeof brandingJson.FaviconPath === 'string' && brandingJson.FaviconPath.length > 0) {
            const favicon = document.querySelector("link[rel='icon']") || document.createElement('link');
            favicon.setAttribute('type', 'image/x-icon');
            favicon.setAttribute('rel', 'icon');
            favicon.setAttribute('href', brandingJson.FaviconPath);
            document.querySelector('head').appendChild(favicon);
        }

        // Set the highlight-colour attribute.
        if (typeof brandingJson.HighlightColour === 'string' && brandingJson.HighlightColour.length > 0) {
            document.documentElement.setAttribute('highlight-colour', brandingJson.HighlightColour.toLowerCase());
        }

        // Set the header title.
        const headerTitleElement = document.createElement('b');
        headerTitleElement.textContent =
            (typeof brandingJson.HeaderTitle === 'string' && brandingJson.HeaderTitle.length > 0)
                ? brandingJson.HeaderTitle
                : 'Admin Hub';
        header.appendChild(headerTitleElement);

        // Set the header subtitle.
        if (typeof brandingJson.HeaderSubtitle === 'string' && brandingJson.HeaderSubtitle.length > 0) {
            const headerSeparatorElement = document.createElement('span');
            headerSeparatorElement.classList = 'header__separator';
            header.appendChild(headerSeparatorElement);
            const headerSubtitleElement = document.createTextNode(brandingJson.HeaderSubtitle);
            header.appendChild(headerSubtitleElement);
        }

        // Set the sidebar image.
        if (typeof brandingJson.ImagePath === 'string' && brandingJson.ImagePath.length > 0) {
            const sidebarImageWrapper = document.createElement('div');
            sidebarImageWrapper.classList = 'sidebar__image-wrapper';
            const sidebarImage = document.createElement('img');
            sidebarImage.classList.add(...createImageClassList(brandingJson));
            sidebarImage.setAttribute('src', brandingJson.ImagePath);
            sidebarImage.setAttribute('alt', 'Admin Hub');
            sidebarImageWrapper.appendChild(sidebarImage);
            sidebar.querySelector('.sidebar__content-container').prepend(sidebarImageWrapper);
        }

        // Set the help hyperlink.
        const helpHyperlink = document.querySelector('#helpHyperlink');
        if (typeof brandingJson.HelpHyperlink === 'string' && brandingJson.HelpHyperlink.length > 0) {
            helpHyperlink.setAttribute('href', brandingJson.HelpHyperlink);
        } else if (typeof brandingJson.HelpHyperlinkPlaceholder === 'string' && brandingJson.HelpHyperlinkPlaceholder.length > 0) {
            helpHyperlink.setAttribute('href', '');
            helpHyperlink.setAttribute('onclick', `alert("${brandingJson.HelpHyperlinkPlaceholder}"); return false;`);
            helpHyperlink.removeAttribute('rel');
            helpHyperlink.removeAttribute('target');
        }

    });

}

// Function to fetch the clocks from the config file and add them to the clocks popup.
function fetchClocks() {

    // We'll fetch then process the clocks.json file (this file can be cached by the web browser).
    fetch(`configuration/clocks.json?${fetchUrlSuffix}`)
    .then(response => {
        if (response.ok) {
            return response.json();
        }
    })
    .then(clocksJson => {

        const clockPopupItemTemplate = document.querySelector("#clockPopupItemTemplate");
        const clockPopupItemContainer = document.querySelector('.clock-popup__item-container');
        clockPopupItemContainer.innerHTML = '';

        for (let i = 0; i < clocksJson.length; i++) {

            // We'll check that a valid time zone is specified for the clock.
            if (typeof clocksJson[i].TimeZone !== 'string' || clocksJson[i].TimeZone.length === 0) {
                throw new Error(`No TimeZone was defined for clock ${i.toString()} in the clocks.json file`);
            }

            let timeZoneDateTimeWithOffsetString;
            try {
                timeZoneDateTimeWithOffsetString = (new Date()).toLocaleString('en-US', { timeZone: clocksJson[i].TimeZone, timeZoneName: 'longOffset' });
            } catch {
                throw new Error(`The TimeZone '${clocksJson[i].TimeZone}' for clock ${i.toString()} in the clocks.json file is not a valid time zone`);
            }

            // If no title is specified in the configuration we'll set the clock's title to be the time zone name.
            const clockTitle =
                (typeof clocksJson[i].Title === 'string' && clocksJson[i].Title.length > 0)
                    ? clocksJson[i].Title
                    : clocksJson[i].TimeZone;

            // We'll start to construct the clock's subtitle.
            let clockSubtitle =
                (typeof clocksJson[i].Subtitle === 'string' && clocksJson[i].Subtitle.length > 0)
                    ? clocksJson[i].Subtitle
                    : '';

            // We'll add the UTC offset to the clock's subtitle.
            const timeZoneOffset = timeZoneDateTimeWithOffsetString.match(/GMT([+-](?:(\d*\:\d*)|(\d*)))/g);
            if (Array.isArray(timeZoneOffset) && typeof timeZoneOffset[0] === 'string' && timeZoneOffset[0].length > 0) {
                const utcTimeZoneOffsetString = timeZoneOffset[0].replace(/^GMT/g, 'UTC');
                if (clockSubtitle.length > 0) {
                    clockSubtitle += ' \u2022 ';
                }
                clockSubtitle += utcTimeZoneOffsetString;
            }

            // We'll create a new clock item and add it to the container.
            const newClockPopupItem = document.importNode(clockPopupItemTemplate.content, true);
            newClockPopupItem.querySelector('.clock-popup__item-title-text').innerText = clockTitle;
            if (clockSubtitle.length > 0) {
                newClockPopupItem.querySelector('.clock-popup__item-subtitle-text').innerText = clockSubtitle;
            } else {
                newClockPopupItem.querySelector('.clock-popup__item-subtitle-text').remove();
            }
            newClockPopupItem.querySelector('.clock-popup__item-time-text').setAttribute('data-timezone', clocksJson[i].TimeZone);
            clockPopupItemContainer.appendChild(newClockPopupItem);

        }

        // Execute the function which sets the clocks, then repeat execution every 10 seconds.
        updateClocks();
        setInterval(updateClocks, 10000);

    });

}

// Function to fetch the hyperlinks from the config file and add them to the sidebar.
function fetchHyperlinks() {

    // We'll fetch then process the hyperlinks.json file (this file can be cached by the web browser).
    fetch(`configuration/hyperlinks.json?${fetchUrlSuffix}`)
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Unable to fetch the hyperlinks.json file');
    })
    .then(hyperlinksJson => {

        const hyperlinkGroupContainer = document.querySelector('.sidebar__hyperlink-group-container');
        hyperlinkGroupContainer.innerHTML = '';

        for (let i = 0; i < hyperlinksJson.length; i++) {

            // We'll create a title for the hyperlink group if one is specified.
            if (typeof hyperlinksJson[i].Title === 'string' && hyperlinksJson[i].Title.length > 0) {
                const newHyperlinkGroupTitleText = document.createElement('div');
                newHyperlinkGroupTitleText.className = 'sidebar__hyperlink-group-title-text';
                newHyperlinkGroupTitleText.innerText = hyperlinksJson[i].Title;
                hyperlinkGroupContainer.appendChild(newHyperlinkGroupTitleText);
            }

            if (!Array.isArray(hyperlinksJson[i].Hyperlinks) || hyperlinksJson[i].Hyperlinks.length === 0) {
                continue;
            }

            // We'll create a new hyperlink group and add all the hyperlinks to it.
            const newHyperlinkGroup = document.createElement('div');
            newHyperlinkGroup.className = 'sidebar__hyperlink-group';
            for (let j = 0; j < hyperlinksJson[i].Hyperlinks.length; j++) {
                newHyperlinkGroup.appendChild(createHyperlink(hyperlinksJson[i].Hyperlinks[j]));
            }
            hyperlinkGroupContainer.appendChild(newHyperlinkGroup);

        }

    });

}

// Function to fetch the custom column configuration from the list view config file.
async function fetchListViewConfiguration() {

    listViewCustomColumns = [];

    // We'll fetch then process the list-view.json file (this file is considered 'live data' and the web browser is not allowed to cache it).
    await fetch('configuration/list-view.json', { cache: 'no-store' })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Unable to fetch the list-view.json file');
    })
    .then(listViewJson => {
        if (!Array.isArray(listViewJson.CustomColumns) || listViewJson.CustomColumns.length === 0) {
            return;
        }
        for (let i = 0; i < listViewJson.CustomColumns.length; i++) {
            if (typeof listViewJson.CustomColumns[i] === 'string' && listViewJson.CustomColumns[i].length > 0) {
                listViewCustomColumns.push(listViewJson.CustomColumns[i]);
            }
        }
    });

}

// Function to load live data (sites and the RSS feed) in to the page.
async function fetchLiveData() {

    const pinnedSites =
        isLocalStorageAccessible
            ? localStorage.getItem('PinnedSites')
            : null;

    const sortBy =
        isLocalStorageAccessible
            ? localStorage.getItem('SortBy') ?? 'data-siteid'
            : 'data-siteid';

    const listViewSortColumn =
        isLocalStorageAccessible
            ? localStorage.getItem('ListViewSortColumn') ?? '1'
            : '1';

    const listViewSortDirection =
        isLocalStorageAccessible
            ? localStorage.getItem('ListViewSortDirection') ?? 'ascending'
            : 'ascending';

    wasLiveDataFetched = false;

    // If there's a details dialog visible we'll record the associated site's ID so we can re-open it after we've fetched the live data.
    let detailsDialogSiteID;
    if (detailsDialog.length > 0) {
        detailsDialogSiteID = detailsDialog[0].getAttribute('data-siteid');
    }

    fetchRssFeed();

    // These fetch functions can run asynchronously between themselves however we can't continue processing until they're all complete.
    await Promise.all([
        fetchStatistics(),
        fetchSites()
    ]);

    // If no live data was fetched there's nothing more we need to do.
    if (!wasLiveDataFetched) {
        return;
    }

    dashboardViewTileContainerPinned.innerHTML = '';

    // If any pinned tiles were specified in the local storage we'll pin them (if they exist).
    if (isLocalStorageAccessible && pinnedSites !== null) {
        const pinnedSitesJson = JSON.parse(pinnedSites);
        for (let i = 0; i < Object.keys(pinnedSitesJson).length; i++) {
            pinTile(pinnedSitesJson[i], true);
        }
        savePinnedTilesToLocalStorage();
    }

    settingsPopupShowStatisticsCheckbox_ChangeEvent();
    sortListViewTable(listViewSortColumn, listViewSortDirection);
    sortTiles(sortBy);
    getListViewColumnVisibilityWidths();
    setListViewTableResponsiveUI();

    // setTileContainerResponsiveUI() will also call the searchTiles() function if we're in search mode.
    setTileContainerResponsiveUI();

    if (content.classList.contains('content--list-view-search-mode')) {
        searchList();
    }

    // If a details dialog was opened before we fetched the live data, we'll re-open it.
    if (detailsDialogSiteID) {
        const tileShowDetailsButton = document.querySelector(`.tile__show-details-button[data-siteid=${detailsDialogSiteID}`);
        if (tileShowDetailsButton) {
            tileShowDetailsButton_ClickEvent(tileShowDetailsButton);
        }
    }

}

// Function to fetch items from the RSS feed and add them to the RSS feed popup.
function fetchRssFeed() {

    let newRssFeedFileAge;
    let rssUrl;

    // We'll fetch then process the rss file (this file is considered 'live data' and the web browser is not allowed to cache it).
    fetch('rss', { cache: 'no-store' })
    .then(response => {
        if (response.ok) {
            newRssFeedFileAge = response.headers.get('Last-Modified');
            rssUrl = response.url;
            return response.text();
        }
        throw new Error('Unable to fetch the RSS file');
    })
    .then(rssText => {
        return new window.DOMParser().parseFromString(rssText, 'text/xml');
    })
    .then(rss => {

        // We don't need to do anything if the file that's just been fetched is the same age as the last file that was successfully fetched.
        if (newRssFeedFileAge === rssFeedFileAge) {
            return;
        }

        rssFeedFileAge = newRssFeedFileAge;

        const rssItems = rss.querySelectorAll('item');
        const rssFeedPopupItemTemplate = document.querySelector("#rssFeedPopupItemTemplate");
        const rssFeedPopupItemContainer = document.querySelector('.rss-feed-popup__item-container');
        rssFeedPopupItemContainer.innerHTML = '';

        // We'll set the default item link to be either the channel link (if specified) or the URL to the RSS feed.
        const rssLink = rss.querySelector('channel > link')?.innerHTML;
        const rssItemDefaultLink =
            (typeof rssLink === 'string' && rssLink.length > 0)
                ? rssLink
                : rssUrl;

        // We'll add each RSS feed item to the RRS feed popup.
        for (let i = 0; i < rssItems.length; i++) {

            const newRssFeedPopupItem = document.importNode(rssFeedPopupItemTemplate.content, true);

            // We'll set the hyperlink URL.
            const rssItemLink = rssItems[i].querySelector('link')?.innerHTML;
            const rssItemLinkHref =
                (typeof rssItemLink === 'string' && rssItemLink.length > 0)
                    ? rssItemLink
                    : rssItemDefaultLink;
            newRssFeedPopupItem.querySelector('.rss-feed-popup__item').setAttribute('href', rssItemLinkHref);

            // We'll set or remove the item's title.
            const rssItemTitle = rssItems[i].querySelector('title')?.innerHTML;
            if (typeof rssItemTitle === 'string' && rssItemTitle.length > 0) {
                newRssFeedPopupItem.querySelector('.rss-feed-popup__item-title-text').innerHTML = rssItemTitle;
            } else {
                newRssFeedPopupItem.querySelector('.rss-feed-popup__item-title-text').remove();
            }

            // We'll set or remove the item's publication date.
            const rssItemPubDate = rssItems[i].querySelector('pubDate')?.innerHTML;
            if (typeof rssItemPubDate === 'string' && rssItemPubDate.length > 0) {
                newRssFeedPopupItem.querySelector('.rss-feed-popup__item-subtitle-text').innerHTML = rssItemPubDate.replace('GMT', 'UTC');
            } else {
                newRssFeedPopupItem.querySelector('.rss-feed-popup__item-subtitle-text').remove();
            }

            // We'll set or remove the item's description.
            const rssItemDescription = rssItems[i].querySelector('description')?.innerHTML;
            if (typeof rssItemDescription === 'string' && rssItemDescription.length > 0) {
                newRssFeedPopupItem.querySelector('.rss-feed-popup__item-body-text').innerHTML = rssItemDescription;
            } else {
                newRssFeedPopupItem.querySelector('.rss-feed-popup__item-body-text').remove()
            }

            rssFeedPopupItemContainer.appendChild(newRssFeedPopupItem);

        }

        // We'll add a link to the RSS feed in the sidebar footer (if it doesn't exist already).
        if (!rssFeedLinkCreated) {
            const rssFeedLink = document.createElement('a');
            rssFeedLink.id = 'rssFeedLink';
            rssFeedLink.setAttribute('href', rssUrl);
            rssFeedLink.setAttribute('rel', 'noopener noreferrer');
            rssFeedLink.setAttribute('target', '_blank');
            rssFeedLink.innerText = 'RSS';
            document.querySelector('.sidebar__footer-controls-container').appendChild(rssFeedLink);
            rssFeedLinkCreated = true;
        }

    });

}

// Function to fetch the sites from the config file and add them to the content pane.
async function fetchSites() {

    let newSitesFileAge;
    await fetchListViewConfiguration();

    // We'll fetch then process the sites.json file (this file is considered 'live data' and the web browser is not allowed to cache it).
    await fetch('configuration/sites.json', { cache: 'no-store' })
    .then(response => {
        if (response.ok) {
            newSitesFileAge = response.headers.get('Last-Modified');
            return response.json();
        }
        throw new Error('Unable to fetch the sites.json file');
    })
    .then(sitesJson => {

        // We don't need to do anything if the file that's just been fetched is the same age as the last file that was successfully fetched.
        if (newSitesFileAge === sitesFileAge) {
            return;
        }

        // We'll check that the sites JSON is valid and all required values are specified.
        if (!checkSitesConfiguration(sitesJson)) {
            return;
        }

        wasLiveDataFetched = true;
        sitesFileAge = newSitesFileAge;

        // We'll remove any of the old tile groups that held live data.
        const oldLiveData = document.querySelectorAll('.dashboard-view__group-container--live-data');
        for (let i = 0; i < oldLiveData.length; i++) {
            oldLiveData[i].remove();
        }

        tileContainerCount = 0;

        // We'll remove the existing rows, columns and headers from the list view table.
        listViewTableBody.innerHTML = '';
        listViewTableColumns.innerHTML = '';
        listViewTableHead.innerHTML = '<tr></tr>';
        const tableHeadRow = listViewTableHead.querySelector('tr');

        // Column 0 (site image).
        const column0 = document.createElement('col');
        column0.classList = 'list-view-table__column--min-width';
        const column0Header = document.createElement('th');
        listViewTableColumns.appendChild(column0);
        tableHeadRow.appendChild(column0Header);

        // Column 1 (site ID).
        const column1 = document.createElement('col');
        const column1Header = document.createElement('th');
        column1Header.classList = 'list-view-table__header--sortable';
        column1Header.setAttribute('onclick', 'listViewTableHeader_ClickEvent(1)');
        column1Header.innerHTML = '<span>ID</span>';
        listViewTableColumns.appendChild(column1);
        tableHeadRow.appendChild(column1Header);

        // Column 2 (site name).
        const column2 = document.createElement('col');
        const column2Header = document.createElement('th');
        column2Header.classList = 'list-view-table__header--sortable';
        column2Header.setAttribute('onclick', 'listViewTableHeader_ClickEvent(2)');
        column2Header.innerHTML = '<span>Name</span>';
        listViewTableColumns.appendChild(column2);
        tableHeadRow.appendChild(column2Header);

        // Column 3 (site tags).
        const column3 = document.createElement('col');
        const column3Header = document.createElement('th');
        column3Header.classList = 'list-view-table__header--sortable';
        column3Header.setAttribute('onclick', 'listViewTableHeader_ClickEvent(3)');
        column3Header.innerHTML = '<span>Tags</span>';
        listViewTableColumns.appendChild(column3);
        tableHeadRow.appendChild(column3Header);

        // Custom columns.
        for (let i = 0; i < listViewCustomColumns.length; i++) {
            const customColumn = document.createElement('col');
            const customColumnHeader = document.createElement('th');
            customColumnHeader.classList = 'list-view-table__header--sortable';
            customColumnHeader.setAttribute('onclick', `listViewTableHeader_ClickEvent(${4 + i})`);
            customColumnHeader.innerHTML = `<span>${listViewCustomColumns[i]}</span>`;
            listViewTableColumns.appendChild(customColumn);
            tableHeadRow.appendChild(customColumnHeader);
        }

        // Last column (controls).
        const lastColumn = document.createElement('col');
        lastColumn.classList = 'list-view-table__column--min-width';
        const lastColumnHeader = document.createElement('th');
        lastColumnHeader.innerHTML = '<span></span>';
        listViewTableColumns.appendChild(lastColumn);
        tableHeadRow.appendChild(lastColumnHeader);

        const tileGroupTemplate = document.querySelector("#tileGroupTemplate");
        const tileSubgroupTemplate = document.querySelector("#tileSubgroupTemplate");

        for (let i = 0; i < sitesJson.length; i++) {

            // We'll create a new tile group.
            const newTileGroup = document.importNode(tileGroupTemplate.content, true);
            newTileGroup.querySelector('.dashboard-view__group-title-text').innerHTML = `<span>${sitesJson[i].GroupName}</span>`;

            if (Array.isArray(sitesJson[i].Sites) && sitesJson[i].Sites.length > 0) {

                // We'll add each site directly to the tile group in dashboard view and in to the table in list view.
                newTileGroup.querySelector('.dashboard-view__group-container').appendChild(createTileContainer(sitesJson[i].Sites));
                for (let j = 0; j < sitesJson[i].Sites.length; j++) {
                    listViewTableBody.appendChild(createSiteRow(sitesJson[i].Sites[j]));
                }

            } else if (Array.isArray(sitesJson[i].Subgroups) && sitesJson[i].Subgroups.length > 0) {

                for (let j = 0; j < sitesJson[i].Subgroups.length; j++) {

                    // We'll create a new tile subgroup.
                    const currentSubgroup = sitesJson[i].Subgroups[j];
                    const newTileSubgroup = document.importNode(tileSubgroupTemplate.content, true);
                    newTileSubgroup.querySelector('.dashboard-view__subgroup-title-text').innerHTML = `<span>${currentSubgroup.SubgroupName}</span>`;

                    // We'll add each site to the tile subgroup in dashboard view and in to the table in list view.
                    newTileSubgroup.querySelector('.dashboard-view__subgroup-container').appendChild(createTileContainer(currentSubgroup.Sites));
                    for (let k = 0; k < currentSubgroup.Sites.length; k++) {
                        listViewTableBody.appendChild(createSiteRow(currentSubgroup.Sites[k]));
                    }

                    newTileGroup.querySelector('.dashboard-view__group-container').appendChild(newTileSubgroup);

                }

            } else {

                // We'll create an empty tile container as there's no sites or subgroups to show.
                const newTileContainer = document.importNode(tileContainerTemplate.content, true);
                newTileGroup.querySelector('.dashboard-view__group-container').appendChild(newTileContainer);

            }

            document.querySelector('.dashboard-view-container').appendChild(newTileGroup);

        }

    });

}

// Function to fetch the statistics from the config file and add them to the content pane.
async function fetchStatistics() {

    let newStatisticsFileAge;

    // We'll fetch then process the statistics.json file (this file is considered 'live data' and the web browser is not allowed to cache it).
    await fetch('configuration/statistics.json', { cache: 'no-store' })
    .then(response => {
        if (response.ok) {
            newStatisticsFileAge = response.headers.get('Last-Modified');
            return response.json();
        }
        throw new Error('Unable to fetch the statistics.json file');
    })
    .then(statisticsJson => {

        // We don't need to do anything if the file that's just been fetched is the same age as the last file that was successfully fetched.
        if (newStatisticsFileAge === statisticsFileAge) {
            return;
        }

        wasLiveDataFetched = true;
        statisticsFileAge = newStatisticsFileAge;

        // We'll hide the statistics container if there's no statistics that need to be displayed.
        if (statisticsJson.length === 0) {
            dashboardViewGroupContainerStatistics.innerHTML = '';
            return;
        }

        const statisticTileTemplate = document.querySelector("#statisticTileTemplate");
        const statisticTileContainer = document.createElement('div');
        statisticTileContainer.classList.add('dashboard-view__statistic-tile-container');

        const subcontainers = [];
        let currentSubcontainer;

        // We'll create a statistic tile for each statistic in the JSON file.
        for (let i = 0; i < statisticsJson.length; i++) {

            // To ensure the UI stays responsive, we align everything in the content pane based on the flow of site tiles.
            // Each site tile in the UI is the same width as two statistic tiles that we're about to create below.
            // To ensure everything lines up, we group every two statistic tiles together in a subcontainer so that their flow matches that of the full width site tiles.
            // If this is an even numbered tile, we'll create a new subcontainer (odd numbered tiles get added to their predecessor's subcontainer).
            if (i % 2 === 0) {
                currentSubcontainer = document.createElement('div');
                currentSubcontainer.classList.add('dashboard-view__statistic-tile-subcontainer');
            }

            const newStatisticTile = document.importNode(statisticTileTemplate.content, true);

            // We'll set the statistic tile's image path.
            if (typeof statisticsJson[i].ImagePath === 'string' && statisticsJson[i].ImagePath.length > 0) {
                newStatisticTile.querySelector('.statistic-tile__image-wrapper').innerHTML = `<img src='${statisticsJson[i].ImagePath}' alt='?'></img>`;
            } else {
                newStatisticTile.querySelector('.statistic-tile__image-wrapper').remove();
            }

            // We'll set the statistic tile's title.
            if (typeof statisticsJson[i].Title === 'string' && statisticsJson[i].Title.length > 0) {
                newStatisticTile.querySelector('.statistic-tile__title-text').innerText = statisticsJson[i].Title;
            } else {
                newStatisticTile.querySelector('.statistic-tile__title-text').remove();
            }

            // We'll set the statistic tile's value.
            if (typeof statisticsJson[i].Value === 'string' && statisticsJson[i].Value.length > 0) {
                newStatisticTile.querySelector('.statistic-tile__value-text').innerText = statisticsJson[i].Value;
            } else {
                newStatisticTile.querySelector('.statistic-tile__value-text').remove();
            }

            // We'll set the statistic tile's tooltip.
            if (typeof statisticsJson[i].Tooltip === 'string' && statisticsJson[i].Tooltip.length > 0) {
                newStatisticTile.querySelector('.statistic-tile').setAttribute('data-tooltip', statisticsJson[i].Tooltip);
            }

            currentSubcontainer.appendChild(newStatisticTile);

            // If this is an odd numbered tile (or the last tile) we'll close off the subcontainer.
            if (i % 2 !== 0 || i >= (statisticsJson.length - 1)) {
                subcontainers.push(currentSubcontainer);
            }

        }

        // Add the subcontainers to the statistic tile container.
        for (let i = 0; i < subcontainers.length; i++) {
            statisticTileContainer.appendChild(subcontainers[i]);
        }

        dashboardViewGroupContainerStatistics.innerHTML = '';
        dashboardViewGroupContainerStatistics.appendChild(statisticTileContainer);

    });

}

// Function to check that the configuration specified in the sites.json file is valid and has all required values.
function checkSitesConfiguration(sitesJson) {

    let siteIDs = [];

    // We'll loop through each group in the sites JSON and check that a GroupName is specified before checking for subgroups and sites.
    for (let i = 0; i < sitesJson.length; i++) {

        if (typeof sitesJson[i].GroupName !== 'string' || sitesJson[i].GroupName.length === 0) {
            throw new Error(`No GroupName was defined for group ${i.toString()} in the sites.json file`);
        }

        if (Array.isArray(sitesJson[i].Sites) && sitesJson[i].Sites.length > 0) {

            // We'll check that each site in the group has a unique ID and a Name.
            for (let j = 0; j < sitesJson[i].Sites.length; j++) {
                if (typeof sitesJson[i].Sites[j].ID !== 'string' || sitesJson[i].Sites[j].ID.length === 0) {
                    throw new Error(`No ID was defined for site ${j.toString()} of group ${i.toString()} in the sites.json file`);
                }
                if (typeof sitesJson[i].Sites[j].Name !== 'string' || sitesJson[i].Sites[j].Name.length === 0) {
                    throw new Error(`No Name was defined for site ${j.toString()} of group ${i.toString()} in the sites.json file`);
                }
                if (siteIDs.includes(sitesJson[i].Sites[j].ID)) {
                    throw new Error(`The ID for site ${j.toString()} of group ${i.toString()} has the same ID as another site in the sites.json file`);
                }
                siteIDs.push(sitesJson[i].Sites[j].ID);
            }

        } else if (Array.isArray(sitesJson[i].Subgroups) && sitesJson[i].Subgroups.length > 0) {

            // This group has subgroups specified instead of sites so we'll check each subgroup and its sites.
            for (let j = 0; j < sitesJson[i].Subgroups.length; j++) {

                const currentSubgroup = sitesJson[i].Subgroups[j];
                if (typeof currentSubgroup.SubgroupName !== 'string' || currentSubgroup.SubgroupName.length === 0) {
                    throw new Error(`No SubgroupName was defined for subgroup ${j.toString()} of group ${i.toString()} in the sites.json file`);
                }

                // We'll check that each site in the subgroup has a unique ID and a Name.
                for (let k = 0; k < currentSubgroup.Sites.length; k++) {
                    if (typeof currentSubgroup.Sites[k].ID !== 'string' || currentSubgroup.Sites[k].ID.length === 0) {
                        throw new Error(`No ID was defined for site ${k.toString()} of subgroup ${j.toString()} of group ${i.toString()} in the sites.json file`);
                    }
                    if (typeof currentSubgroup.Sites[k].Name !== 'string' || currentSubgroup.Sites[k].Name.length === 0) {
                        throw new Error(`No Name was defined for site ${k.toString()} of subgroup ${j.toString()} of group ${i.toString()} in the sites.json file`);
                    }
                    if (siteIDs.includes(currentSubgroup.Sites[k].ID)) {
                        throw new Error(`The ID for site ${k.toString()} of subgroup ${j.toString()} of group ${i.toString()} has the same ID as another site in the sites.json file`);
                    }
                    siteIDs.push(currentSubgroup.Sites[k].ID);
                }

            }

        }

    }

    return true;

}

// #endregion Fetch Functions



// #region Window Event Handlers

// Function that gets executed when the mouse is clicked in the window.
function window_ClickEvent(event) {

    let closeSidebar = true;
    let exitSearchMode = true;

    // Hide any hyperlink popups that are visible.
    if (!event.target.closest('.hyperlink-popup-button')) {
        for (let i = 0; i < hyperlinkPopups.length; i++) {
            if (hyperlinkPopups[i].classList.contains('hyperlink-popup--visible')) {
                hyperlinkPopups[i].classList.remove('hyperlink-popup--visible', 'hyperlink-popup--visible-below-button');
                exitSearchMode = false;
            }
        }
    }

    // Hide the clock popup, if its open.
    if (contentClockContainer.classList.contains('content__button-container--show-popup')) {
        if (!event.target.closest('.content__clock-container')) {
            contentClockContainer.classList.remove('content__button-container--show-popup');
        }
        exitSearchMode = false;
    }

    // Hide the RSS feed popup, if its open.
    if (contentRssFeedContainer.classList.contains('content__button-container--show-popup')) {
        if (!event.target.closest('.content__rss-feed-button')) {
            contentRssFeedContainer.classList.remove('content__button-container--show-popup');
        }
        exitSearchMode = false;
    }

    // Hide the accessibility popup, if its open.
    if (contentAccessibilityContainer.classList.contains('content__button-container--show-popup')) {
        if (!event.target.closest('.content__accessibility-button')) {
            contentAccessibilityContainer.classList.remove('content__button-container--show-popup');
        }
        exitSearchMode = false;
    }

    // Hide the settings popup, if its open.
    if (contentSettingsContainer.classList.contains('content__button-container--show-popup')) {
        if (!event.target.closest('.content__settings-button')) {
            contentSettingsContainer.classList.remove('content__button-container--show-popup');
        }
        exitSearchMode = false;
    }

    // Close the about dialog, if its open.
    if (aboutDialog.open) {
        if (!event.target.closest('#aboutButton') && !event.target.closest('.about-dialog__content-container')) {
            aboutDialog.close();
        }
        closeSidebar = false;
        exitSearchMode = false;
    }

    // Close the details dialog, if there's one open.
    if (detailsDialog.length > 0) {
        if (!event.target.closest('.tile__show-details-button') && !event.target.closest('.list-view-table__row') && !event.target.closest('.details-dialog__content-container')) {
            closeDetailsDialog();
        }
        exitSearchMode = false;
    }

    // Hide the sidebar, if its unpinned and shown.
    if (closeSidebar && sidebar.classList.contains('sidebar--show-unpinned') && !event.target.closest('.about-dialog__content-container')) {
        if (!event.target.closest('.sidebar') && !event.target.closest('.content__sidebar-expander-button')) {
            sidebar.classList.remove('sidebar--show-unpinned');
        }
        exitSearchMode = false;
    }

    // Exit search mode, if its active.
    if (exitSearchMode &&
        content.classList.contains('content--search-mode') &&
        !event.target.closest('.content__search-container') &&
        !event.target.closest('.content__theme-toggle-container') &&
        !event.target.closest('.content__view-toggle-container') &&
        !event.target.closest('.content__rss-feed-container') &&
        !event.target.closest('.content__settings-container') &&
        !event.target.closest('.content__clock-container') &&
        !event.target.closest('.tile')) {
        contentSearchInput.value = '';
        searchTiles();
    }

}

// Function that gets executed when the window is loaded.
async function window_LoadEvent() {

    // We'll fetch all of the static configuration for the website (except for the clocks).
    fetchBranding();
    fetchHyperlinks();

    // We'll check if local storage is available.
    try {
        isLocalStorageAccessible = ('localStorage' in window && window['localStorage'] !== null);
    } catch {
        isLocalStorageAccessible = false;
    }

    if (!isLocalStorageAccessible) {
        alert('Admin Hub won\'t be able to save pinned sites and changes to preferences as your web browser\'s local storage can\'t be accessed.\n\nAny changes you make to Admin Hub will be lost when you refresh or close the page.');
    }

    // We'll load the user's settings from local storage and configure elements on the page accordingly.

    const pinSidebar =
        isLocalStorageAccessible
            ? localStorage.getItem('PinSidebar') ?? 'true'
            : 'true';
    settingsPopupPinSidebarCheckbox.checked = (pinSidebar === 'true');
    settingsPopupPinSidebarCheckbox_ChangeEvent();

    const showThemeToggle =
        isLocalStorageAccessible
            ? localStorage.getItem('ShowThemeToggle') ?? 'true'
            : 'true';
    settingsPopupShowThemeToggleCheckbox.checked = (showThemeToggle === 'true');
    settingsPopupShowThemeToggleCheckbox_ChangeEvent();

    const showViewToggle =
        isLocalStorageAccessible
            ? localStorage.getItem('ShowViewToggle') ?? 'true'
            : 'true';
    settingsPopupShowViewToggleCheckbox.checked = (showViewToggle === 'true');
    settingsPopupShowViewToggleCheckbox_ChangeEvent();

    const showRssFeed =
        isLocalStorageAccessible
            ? localStorage.getItem('ShowRssFeed') ?? 'true'
            : 'true';
    settingsPopupShowRssFeedCheckbox.checked = (showRssFeed === 'true');
    settingsPopupShowRssFeedCheckbox_ChangeEvent();

    const showClock =
        isLocalStorageAccessible
            ? localStorage.getItem('ShowClock') ?? 'true'
            : 'true';
    settingsPopupShowClockCheckbox.checked = (showClock === 'true');
    settingsPopupShowClockCheckbox_ChangeEvent();

    const showStatistics =
        isLocalStorageAccessible
            ? localStorage.getItem('ShowStatistics') ?? 'true'
            : 'true';
    settingsPopupShowStatisticsCheckbox.checked = (showStatistics === 'true');
    // settingsPopupShowStatisticsCheckbox_ChangeEvent() is called by fetchLiveData()

    const autoDataUpdate =
        isLocalStorageAccessible
            ? localStorage.getItem('AutoDataUpdate') ?? 'true'
            : 'true';
    settingsPopupAutomaticallyUpdateDataCheckbox.checked = (autoDataUpdate === 'true');
    settingsPopupAutomaticallyUpdateDataCheckbox_ChangeEvent(true);

    const accessibilityNoTransparency =
        isLocalStorageAccessible
            ? localStorage.getItem('AccessibilityNoTransparency') ?? 'false'
            : 'false';
    settingsPopupAccessibilityNoTransparencyCheckbox.checked = (accessibilityNoTransparency === 'true');
    settingsPopupAccessibilityNoTransparencyCheckbox_ChangeEvent();

    const accessibilityBorders =
        isLocalStorageAccessible
            ? localStorage.getItem('AccessibilityBorders') ?? 'false'
            : 'false';
    settingsPopupAccessibilityBordersCheckbox.checked = (accessibilityBorders === 'true');
    settingsPopupAccessibilityBordersCheckbox_ChangeEvent();

    const colourTheme =
        isLocalStorageAccessible
            ? localStorage.getItem('ColourTheme') ?? 'light-mode'
            : 'light-mode';
    setColourTheme(colourTheme);

    const view =
        isLocalStorageAccessible
            ? localStorage.getItem('View') ?? 'dashboard-view'
            : 'dashboard-view';
    setView(view, true);

    const listViewSortColumn =
        isLocalStorageAccessible
            ? localStorage.getItem('ListViewSortColumn') ?? '1'
            : '1';

    const listViewSortDirection =
        isLocalStorageAccessible
            ? localStorage.getItem('ListViewSortDirection') ?? 'ascending'
            : 'ascending';

    // We'll wait for the live data to be fetched before setting the clock configuration.
    // We fetch the clocks after the live data fetch has completed as the fetchClocks() function indirectly handles the text displayed to the user that shows when live data was last updated.
    await fetchLiveData();
    fetchClocks();

    // We'll sort the list view table.
    sortListViewTable(listViewSortColumn, listViewSortDirection);

    // We'll add event listeners and observers.
    window.addEventListener('click', (event) => { window_ClickEvent(event) });
    window.addEventListener('keydown', (event) => { window_KeyDownEvent(event) });
    window.addEventListener('keyup', (event) => { window_KeyUpEvent(event) });
    window.addEventListener('resize', debounce(window_ResizeEvent, 250));
    aboutDialog.addEventListener('keydown', (event) => { if (event.key === 'Escape') { event.preventDefault(); } });
    contentSearchInput.addEventListener('keyup', debounce((event) => { contentSearchInput_KeyUpEvent(event) }, 100));
    new ResizeObserver(debounce(setListViewTableResponsiveUI, 250)).observe(content);

    const urlParameters = new URLSearchParams(window.location.search);
    const searchParameter = urlParameters.get('search');

    // If the URL includes '?search=<string>', we'll perform a search for '<string>'.
    if (searchParameter) {

        contentSearchInput.value = searchParameter;
        if (content.classList.contains('content--list-view')) {
            searchList();
        } else {
            searchTiles();
        }

        // If the browser supports it, we'll remove the search parameter from the URL (so that if the user refreshes the page it won't search again).
        if (history.replaceState) {
            urlParameters.delete('search');
            const newUrlParameters = (urlParameters.toString().length > 0 ? '?' + urlParameters.toString() : '');
            const newUrl = (window.location.protocol + '//' + window.location.host + window.location.pathname + newUrlParameters + window.location.hash);
            history.replaceState(null, '', newUrl);
        }

    }

    window_ResizeEvent();

}

// Function that gets executed when a key down event occurs within the window.
function window_KeyDownEvent(event) {
    if (event.ctrlKey && event.code === 'KeyK') {
        event.preventDefault();
    }
}

// Function that gets executed when a key up event occurs within the window.
function window_KeyUpEvent(event) {

    const ctrlKPressed = (event.ctrlKey && event.code === 'KeyK');

    if (event.key !== 'Escape' && !ctrlKPressed) {
        return;
    }

    let closeSidebar = true;
    let exitSearchMode = true;

    // Hide any tile hyperlink popups that are visible.
    for (let i = 0; i < hyperlinkPopups.length; i++) {
        if (hyperlinkPopups[i].classList.contains('hyperlink-popup--visible')) {
            hyperlinkPopups[i].classList.remove('hyperlink-popup--visible', 'hyperlink-popup--visible-below-button');
            exitSearchMode = false;
        }
    }

    // Hide the clock popup, if its open.
    if (contentClockContainer.classList.contains('content__button-container--show-popup')) {
        contentClockContainer.classList.remove('content__button-container--show-popup');
        exitSearchMode = false;
    }

    // Hide the RSS feed popup, if its open.
    if (contentRssFeedContainer.classList.contains('content__button-container--show-popup')) {
        contentRssFeedContainer.classList.remove('content__button-container--show-popup');
        exitSearchMode = false;
    }

    // Hide the accessibility popup, if its open.
    if (contentAccessibilityContainer.classList.contains('content__button-container--show-popup')) {
        contentAccessibilityContainer.classList.remove('content__button-container--show-popup');
        exitSearchMode = false;
    }

    // Hide the settings popup, if its open.
    if (contentSettingsContainer.classList.contains('content__button-container--show-popup')) {
        contentSettingsContainer.classList.remove('content__button-container--show-popup');
        exitSearchMode = false;
    }

    // Close the about dialog, if its open.
    if (aboutDialog.open) {
        aboutDialog.close();
        closeSidebar = false;
        exitSearchMode = false;
    }

    // Close the details dialog, if there's one open.
    if (detailsDialog.length > 0) {
        const detailsDialogSearchInput = detailsDialog[0].querySelector('.details-dialog__search-container > input');
        if (detailsDialogSearchInput.value === '') {
            closeDetailsDialog();
        } else {
            detailsDialogSearchInput.value = '';
            searchDetailsDialog(detailsDialogSearchInput);
        }
        exitSearchMode = false;
    }

    // Hide the sidebar, if its unpinned and shown.
    if (closeSidebar && sidebar.classList.contains('sidebar--show-unpinned') & !event.target.closest('.about-dialog__content-container')) {
        sidebar.classList.remove('sidebar--show-unpinned');
        exitSearchMode = false;
    }

    // Give the search input focus.
    if (ctrlKPressed) {
        contentSearchInput.focus();

    // Exit search mode, if its active.
    } else if (exitSearchMode) {
        if (content.classList.contains('content--search-mode')) {
            contentSearchInput.value = '';
            contentSearchInput.blur();
            searchTiles();
        } else if (content.classList.contains('content--list-view-search-mode')) {
            contentSearchInput.value = '';
            contentSearchInput.blur();
            searchList();
        } else if (document.activeElement === contentSearchInput) {
            contentSearchInput.blur();
        }
    }

}

// Function that gets executed when the window is resized.
function window_ResizeEvent() {

    // If the sidebar is pinned, and the document width is greater than the minimum allowed width, we'll remove the class that ordinarily shows an unpinned sidebar.
    if (!sidebar.classList.contains('sidebar--unpinned') && document.body.clientWidth >= pinnedSidebarMinimumWidth) {
        sidebar.classList.remove('sidebar--show-unpinned');
    }

    // If the document height is less than the minimum allowed height for search we'll clear the search.
    if (document.body.clientHeight < searchMinimumHeight) {
        contentSearchInput.value = '';
        contentSearchInput.blur();
        if (content.classList.contains('content--list-view')) {
            searchList();
        } else {
            searchTiles();
        }
    }

    // We'll set the left value that's used by the information and details dialog in small windows (so that its aligned with the left most control in the content pane).
    if (content.classList.contains('content--search-mode')) {
        document.documentElement.style.setProperty('--small-window-pane-left', (contentSearchInput.getBoundingClientRect().left) + 'px');
    } else {
        document.documentElement.style.setProperty('--small-window-pane-left', (contentSidebarExpanderContainer.getBoundingClientRect().left) + 'px');
    }

}

// #endregion Window Event Handlers



// #region Control Event Handlers

// Function that gets executed when the about button at the bottom of the sidebar is clicked.
function aboutButton_ClickEvent() {
    aboutDialog.showModal();
}

// Function that gets executed when the close button in the about dialog is clicked.
function aboutDialogCloseButton_ClickEvent() {
    aboutDialog.close();
}

// Function that gets executed when a column header in the list view table is clicked.
function listViewTableHeader_ClickEvent(columnIndex) {
    const newSortColumn = columnIndex.toString();
    const newSortDirection = (currentListViewSortDirection === 'ascending' && currentListViewSortColumn === newSortColumn) ? 'descending' : 'ascending';
    sortListViewTable(newSortColumn, newSortDirection);
}

// Function that gets executed when a list view table row is clicked.
function listViewTableRow_ClickEvent(element, event) {
    if (!event.target.closest('.list-view-table__cell-controls-container')) {
        showDetailsDialog(
            element.getAttribute('data-siteid'),
            element.getAttribute('data-sitename'),
            element.getAttribute('data-siteimage'),
            element.getAttribute('data-sitedetails')
        );
    }
}

// Function that gets executed when the sidebar expander button is clicked.
function contentSidebarButton_ClickEvent() {
    sidebar.classList.toggle('sidebar--show-unpinned');
}

// Function that gets executed when the close button within the search input is clicked.
function contentSearchCloseButton_ClickEvent() {
    contentSearchInput.value = '';
    if (content.classList.contains('content--list-view')) {
        searchList();
    } else {
        searchTiles();
    }
}

// Function that gets executed when a key up event occurs within the search input.
function contentSearchInput_KeyUpEvent(event) {

    if (event.key === 'Escape' || event.key === 'Tab' || event.key === 'Control' || (event.ctrlKey && event.code === 'KeyK')) {
        return;
    }

    if (content.classList.contains('content--list-view')) {
        searchList();
    } else {
        searchTiles();
    }

}

// Function that gets executed when the RSS feed button is clicked.
function contentRssFeedButton_ClickEvent() {
    contentRssFeedContainer.classList.toggle('content__button-container--show-popup');
}

// Function that gets executed when the theme toggle button is clicked.
function contentThemeToggleButton_ClickEvent() {
    if (document.documentElement.getAttribute('colour-theme') === 'light-mode') {
        setColourTheme('dark-mode');
    } else {
        setColourTheme('light-mode');
    }
}

// Function that gets executed when the view toggle button is clicked.
function contentViewToggleButton_ClickEvent() {
    if (content.classList.contains('content--list-view')) {
        setView('dashboard-view');
    } else {
        setView('list-view');
    }
}

// Function that gets executed when the accessibility button is clicked.
function contentAccessibilityButton_ClickEvent() {
    contentAccessibilityContainer.classList.toggle('content__button-container--show-popup');
}

// Function that gets executed when the settings button is clicked.
function contentSettingsButton_ClickEvent() {
    contentSettingsContainer.classList.toggle('content__button-container--show-popup');
}

// Function that gets executed when the clock button is clicked.
function contentClockButton_ClickEvent() {
    contentClockContainer.classList.toggle('content__button-container--show-popup');
}

// Function that gets executed when the details dialog is closed.
function detailsDialog_CloseEvent(event) {
    event.target.removeEventListener('keydown', detailsDialog_KeyDownEvent);
    setTimeout(() => { event.target.remove(); }, 300);
}

// Function that gets executed when a key down event occurs within the details dialog.
function detailsDialog_KeyDownEvent(event) {
    if (event.key === 'Escape') {
        event.preventDefault();
    }
}

// Function that gets executed when the close button in the details dialog is clicked.
function detailsDialogCloseButton_ClickEvent(element) {
    closeDetailsDialog();
}

// Function that gets executed when the expand/collapse all button in the details dialog is clicked.
function detailsDialogExpandAllButton_ClickEvent(element) {

    const expandAll = window.getComputedStyle(element, '::after').getPropertyValue('--expand-all');
    const details = element.parentNode.parentNode.querySelectorAll('details');

    // We'll either open or close all of the details disclosure elements based on the --expand-all custom property.
    if (expandAll == 'true') {
        for (let i = 0; i < details.length; i++) {
            details[i].setAttribute('open', true);
        }
    } else {
        for (let i = 0; i < details.length; i++) {
            details[i].removeAttribute('open');
        }
    }

}

// Function that gets executed when a key up event occurs within the details dialog search input.
function detailsDialogSearchInput_KeyUpEvent(event) {
    if (event.key !== 'Escape' && event.key !== 'Tab' && event.key !== 'Control' && !(event.ctrlKey && event.code === 'KeyK')) {
        searchDetailsDialog(event.target);
    }
}

// Function that gets executed when the close button within the details dialog search input is clicked.
function detailsDialogSearchCloseButton_ClickEvent(element) {
    const detailsDialogSearchInput = element.parentNode.parentNode.querySelector('input');
    detailsDialogSearchInput.value = '';
    searchDetailsDialog(detailsDialogSearchInput);
}

// Function that gets executed when one of the pin/unpin buttons are clicked.
function pinButton_ClickEvent(element) {
    const siteID = element.getAttribute('data-siteid');
    const tile = document.querySelector(`.tile[data-siteid="${siteID}"]`);
    if (tile.classList.contains('tile--pinned')) {
        unpinTile(siteID);
    } else {
        pinTile(siteID);
    }
}

// Function that gets executed when the 'Pin sidebar' checkbox state is changed.
function settingsPopupPinSidebarCheckbox_ChangeEvent() {

    // Depending on whether or not the checkbox is checked, we'll add or remove the class that makes the sidebar unpinned.
    if (settingsPopupPinSidebarCheckbox.checked) {
        sidebar.classList.remove('sidebar--unpinned');
    } else {
        sidebar.classList.add('sidebar--unpinned');
    }

    if (isLocalStorageAccessible) {
        window.localStorage.setItem('PinSidebar', settingsPopupPinSidebarCheckbox.checked);
    }

}

// Function that gets executed when the 'Show dark mode toggle' checkbox state is changed.
function settingsPopupShowThemeToggleCheckbox_ChangeEvent() {

    // Depending on whether or not the checkbox is checked, we'll add or remove the class that makes the theme toggle button hidden.
    if (settingsPopupShowThemeToggleCheckbox.checked) {
        contentThemeToggleContainer.classList.remove('content__button-container--hidden');
    } else {
        contentThemeToggleContainer.classList.add('content__button-container--hidden');
    }

    if (isLocalStorageAccessible) {
        window.localStorage.setItem('ShowThemeToggle', settingsPopupShowThemeToggleCheckbox.checked);
    }

}

// Function that gets executed when the 'Show view toggle' checkbox state is changed.
function settingsPopupShowViewToggleCheckbox_ChangeEvent() {

    // Depending on whether or not the checkbox is checked, we'll add or remove the class that makes the view toggle button hidden.
    if (settingsPopupShowViewToggleCheckbox.checked) {
        contentViewToggleContainer.classList.remove('content__button-container--hidden');
    } else {
        contentViewToggleContainer.classList.add('content__button-container--hidden');
    }

    if (isLocalStorageAccessible) {
        window.localStorage.setItem('ShowViewToggle', settingsPopupShowViewToggleCheckbox.checked);
    }

}

// Function that gets executed when the 'Show RSS feed' checkbox state is changed.
function settingsPopupShowRssFeedCheckbox_ChangeEvent() {

    // Depending on whether or not the checkbox is checked, we'll add or remove the class that makes the RSS feed button and popup hidden.
    if (settingsPopupShowRssFeedCheckbox.checked) {
        contentRssFeedContainer.classList.remove('content__button-container--hidden');
    } else {
        contentRssFeedContainer.classList.add('content__button-container--hidden');
    }

    if (isLocalStorageAccessible) {
        window.localStorage.setItem('ShowRssFeed', settingsPopupShowRssFeedCheckbox.checked);
    }

}

// Function that gets executed when the 'Show clock' checkbox state is changed.
function settingsPopupShowClockCheckbox_ChangeEvent() {

    // Depending on whether or not the checkbox is checked, we'll add or remove the class that makes the clock button and popup hidden.
    if (settingsPopupShowClockCheckbox.checked) {
        contentClockContainer.classList.remove('content__button-container--hidden');
    } else {
        contentClockContainer.classList.add('content__button-container--hidden');
    }

    if (isLocalStorageAccessible) {
        window.localStorage.setItem('ShowClock', settingsPopupShowClockCheckbox.checked);
    }

}

// Function that gets executed when the 'Automatically update data' checkbox state is changed.
function settingsPopupAutomaticallyUpdateDataCheckbox_ChangeEvent(isOnWindowLoad = false) {

    if (isLocalStorageAccessible) {
        window.localStorage.setItem('AutoDataUpdate', settingsPopupAutomaticallyUpdateDataCheckbox.checked);
    }

    if (!settingsPopupAutomaticallyUpdateDataCheckbox.checked) {
        fetchLiveDataOnNextClockTick = false;
    } else if (!isOnWindowLoad) {
        fetchLiveDataOnNextClockTick = true;
        updateClocks();
    }

}

// Function that gets executed when the 'Show statistics' checkbox state is changed.
function settingsPopupShowStatisticsCheckbox_ChangeEvent() {

    // Depending on whether or not the checkbox is checked, we'll add or remove the class that makes the statistics group hidden.
    if (settingsPopupShowStatisticsCheckbox.checked) {
        dashboardViewGroupContainerStatistics.classList.remove('dashboard-view__group-container--hidden');
    } else {
        dashboardViewGroupContainerStatistics.classList.add('dashboard-view__group-container--hidden');
    }

    if (isLocalStorageAccessible) {
        window.localStorage.setItem('ShowStatistics', settingsPopupShowStatisticsCheckbox.checked);
    }

}

// Function that gets executed when the 'Reduce transparency' checkbox state is changed.
function settingsPopupAccessibilityNoTransparencyCheckbox_ChangeEvent() {

    // Depending on whether or not the checkbox is checked, we'll set the attribute which determines whether no transparency is used.
    document.documentElement.setAttribute('accessibility-no-transparency', settingsPopupAccessibilityNoTransparencyCheckbox.checked);

    if (isLocalStorageAccessible) {
        window.localStorage.setItem('AccessibilityNoTransparency', settingsPopupAccessibilityNoTransparencyCheckbox.checked);
    }

}

// Function that gets executed when the 'Show element outlines' checkbox state is changed.
function settingsPopupAccessibilityBordersCheckbox_ChangeEvent() {

    // Depending on whether or not the checkbox is checked, we'll set the attribute which determines whether enhanced borders are shown.
    document.documentElement.setAttribute('accessibility-borders', settingsPopupAccessibilityBordersCheckbox.checked);

    if (isLocalStorageAccessible) {
        window.localStorage.setItem('AccessibilityBorders', settingsPopupAccessibilityBordersCheckbox.checked);
    }

}

// Function that gets executed when one of the '...' buttons is clicked.
function showHyperlinkPopupButton_ClickEvent(element) {

    const hyperlinkPopup = element.parentNode.querySelector('.hyperlink-popup');

    if (hyperlinkPopup.classList.contains('hyperlink-popup--visible')) {
        hyperlinkPopup.classList.remove('hyperlink-popup--visible', 'hyperlink-popup--visible-below-button');
    } else {

        hyperlinkPopup.classList.add('hyperlink-popup--visible');

        // If the top of the hyperlink popup is higher that the bottom of the blur effect by the controls, we'll make the popup appear beneath the button.
        if (hyperlinkPopup.getBoundingClientRect().top < contentHeaderContainerEffect.getBoundingClientRect().bottom) {
            hyperlinkPopup.classList.add('hyperlink-popup--visible-below-button');
        }

    }

    // Hide all of the other hyperlink popups.
    for (let i = 0; i < hyperlinkPopups.length; i++) {
        if (hyperlinkPopups[i] !== hyperlinkPopup) {
            hyperlinkPopups[i].classList.remove('hyperlink-popup--visible', 'hyperlink-popup--visible-below-button');
        }
    }

}

// Function that gets executed when the tile show details button is clicked.
function tileShowDetailsButton_ClickEvent(element) {
    showDetailsDialog(
        element.getAttribute('data-siteid'),
        element.getAttribute('data-sitename'),
        element.getAttribute('data-siteimage'),
        element.getAttribute('data-sitedetails')
    );
}

// #endregion Control Event Handlers



// #region HTML Element Creation Functions

// Function to create a hyperlink HTML element.
function createHyperlink(hyperlinkConfiguration, imageOnlyHyperlink = false) {

    const newHyperlink = document.createElement('a');

    if (typeof hyperlinkConfiguration.OpenUrlInNewTab === 'undefined' || hyperlinkConfiguration.OpenUrlInNewTab !== false) {
        newHyperlink.setAttribute('rel', 'noopener noreferrer');
        newHyperlink.setAttribute('target', '_blank');
    }

    if (typeof hyperlinkConfiguration.Url === 'string' && hyperlinkConfiguration.Url.length > 0) {
        newHyperlink.setAttribute('href', hyperlinkConfiguration.Url);
    }

    if (typeof hyperlinkConfiguration.ImagePath === 'string' && hyperlinkConfiguration.ImagePath.length > 0) {
        const newHyperlinkImage = document.createElement('img');
        newHyperlinkImage.setAttribute('src', hyperlinkConfiguration.ImagePath);
        newHyperlinkImage.setAttribute('alt', '?');
        newHyperlinkImage.classList.add(...createImageClassList(hyperlinkConfiguration));
        newHyperlink.prepend(newHyperlinkImage);
    }

    if (typeof hyperlinkConfiguration.Title === 'string' && hyperlinkConfiguration.Title.length > 0) {
        if (imageOnlyHyperlink) {
            newHyperlink.setAttribute('data-tooltip', hyperlinkConfiguration.Title);
        } else {
            const newHyperlinkSpan = document.createElement('span');
            newHyperlinkSpan.innerText = hyperlinkConfiguration.Title;
            newHyperlink.appendChild(newHyperlinkSpan);
        }
    }

    return newHyperlink;

}

// Function to create the class list for an image element.
function createImageClassList(imageConfiguration) {
    let classList = [];
    if (imageConfiguration.ImageAllowBrightnessControl) {
        classList.push('image--allow-brightness-control');
    } else if (imageConfiguration.ImageAllowColourInversion) {
        classList.push('image--allow-colour-inversion');
    }
    if (imageConfiguration.ImageShadow) {
        classList.push('image--drop-shadow');
    }
    return classList;
}

// Function to create a site row HTML element.
function createSiteRow(siteConfiguration) {

    const newSiteRow = document.createElement('tr');
    newSiteRow.classList = 'list-view-table__row';

    // Column 0 (site image).
    const column0Cell = document.createElement('td');
    const newSiteImageWrapper = document.createElement('div');
    newSiteImageWrapper.classList = 'list-view-table__cell-image-container';

    const newSiteImage = document.createElement('img');
    if (typeof siteConfiguration.ImagePath === 'string' && siteConfiguration.ImagePath.length > 0) {
        newSiteImage.classList.add(...createImageClassList(siteConfiguration));
        newSiteImage.setAttribute('src', siteConfiguration.ImagePath);
    } else {
        newSiteImage.classList.add('image--allow-brightness-control');
        newSiteImage.setAttribute('src', 'images/data-centre.svg');
    }
    newSiteImage.setAttribute('alt', '?');

    newSiteImageWrapper.appendChild(newSiteImage);
    column0Cell.appendChild(newSiteImageWrapper);
    newSiteRow.appendChild(column0Cell);

    // Column 1 (site ID).
    const column1Cell = document.createElement('td');
    column1Cell.classList = 'list-view-table__cell--bold-text';
    column1Cell.innerText = siteConfiguration.ID;
    newSiteRow.appendChild(column1Cell);
    newSiteRow.setAttribute('data-sorttextcol1', siteConfiguration.ID);

    // Column 2 (site name).
    const column2Cell = document.createElement('td');
    column2Cell.innerText = siteConfiguration.Name;
    newSiteRow.appendChild(column2Cell);
    newSiteRow.setAttribute('data-sorttextcol2', siteConfiguration.Name);

    // Column 3 (site tags).
    const column3Cell = document.createElement('td');
    newSiteRow.setAttribute('data-sorttextcol3', '9');

    if (Array.isArray(siteConfiguration.Tags) && siteConfiguration.Tags.length > 0) {

        const newTagContainer = document.createElement('div');
        newTagContainer.classList = 'list-view-table__cell-tag-container';

        for (let i = 0; i < siteConfiguration.Tags.length; i++) {

            newTagContainer.appendChild(createTag(siteConfiguration.Tags[i], false, false));

            if (typeof siteConfiguration.Tags[i].Text !== 'string') {
                continue;
            }

            // We'll see if we can determine the status of the site based on tag keywords.
            switch (siteConfiguration.Tags[i].Text.toLowerCase()) {
                case 'online':
                    newSiteRow.setAttribute('data-sorttextcol3', '0');
                    newSiteRow.setAttribute('data-searchtextcol3', 'online');
                    break;
                case 'slow':
                    newSiteRow.setAttribute('data-sorttextcol3', '1');
                    newSiteRow.setAttribute('data-searchtextcol3', 'online slow');
                    break;
                case 'offline':
                    newSiteRow.setAttribute('data-sorttextcol3', '2');
                    newSiteRow.setAttribute('data-searchtextcol3', 'offline');
            }

        }

        column3Cell.appendChild(newTagContainer);

    } else {
        column3Cell.classList = 'list-view-table__cell--small-text';
        column3Cell.innerText = '-';
    }

    newSiteRow.appendChild(column3Cell);

    // Custom columns.
    const customColumnsSpecified = (Array.isArray(siteConfiguration.ListViewCustomColumns) && siteConfiguration.ListViewCustomColumns.length > 0);

    for (let i = 0; i < listViewCustomColumns.length; i++) {

        const customColumnCell = document.createElement('td');
        customColumnCell.classList = 'list-view-table__cell--small-text';

        if (customColumnsSpecified && typeof siteConfiguration.ListViewCustomColumns[i] === 'string' && siteConfiguration.ListViewCustomColumns[i].length > 0) {
            newSiteRow.setAttribute(`data-sorttextcol${4 + i}`, siteConfiguration.ListViewCustomColumns[i]);
            customColumnCell.innerText = siteConfiguration.ListViewCustomColumns[i];
        } else {
            customColumnCell.innerText = '-';
        }

        newSiteRow.appendChild(customColumnCell);

    }

    // Last column (controls).
    const controlsCell = document.createElement('td');
    const newControlContainer = document.createElement('div');
    newControlContainer.classList = 'list-view-table__cell-controls-container';

    // We'll create the main hyperlinks in the controls container.
    if (typeof siteConfiguration.Hyperlink1 !== 'undefined' && siteConfiguration.Hyperlink1 !== null) {
        newControlContainer.appendChild(createHyperlink(siteConfiguration.Hyperlink1, true));
    }
    if (typeof siteConfiguration.Hyperlink2 !== 'undefined' && siteConfiguration.Hyperlink2 !== null) {
        newControlContainer.appendChild(createHyperlink(siteConfiguration.Hyperlink2, true));
    }

    // We'll add a button and popup for any additional hyperlinks that are specified.
    if (Array.isArray(siteConfiguration.AdditionalHyperlinks) && siteConfiguration.AdditionalHyperlinks.length > 0) {
        const hyperlinkPopupTemplate = document.querySelector("#hyperlinkPopupTemplate");
        const newHyperlinkPopup = document.importNode(hyperlinkPopupTemplate.content, true);
        newHyperlinkPopup.querySelector('.hyperlink-popup-button').setAttribute('data-tooltip', 'Hyperlinks');
        for (let i = 0; i < siteConfiguration.AdditionalHyperlinks.length; i++) {
            newHyperlinkPopup.querySelector('.hyperlink-popup__content-container').appendChild(createHyperlink(siteConfiguration.AdditionalHyperlinks[i]));
        }
        newControlContainer.appendChild(newHyperlinkPopup);
    }

    controlsCell.appendChild(newControlContainer);
    newSiteRow.appendChild(controlsCell);

    // We'll add a click event to the row to show any additional details that are specified.
    if (Array.isArray(siteConfiguration.AdditionalDetails) && siteConfiguration.AdditionalDetails.length > 0) {
        newSiteRow.classList.add('list-view-table__row--clickable');
        newSiteRow.setAttribute('onclick', 'listViewTableRow_ClickEvent(this, event)');
        newSiteRow.setAttribute('data-siteid', siteConfiguration.ID);
        newSiteRow.setAttribute('data-sitename', siteConfiguration.Name);
        newSiteRow.setAttribute('data-siteimage', newSiteImage.outerHTML);
        newSiteRow.setAttribute('data-sitedetails', JSON.stringify(siteConfiguration.AdditionalDetails));
    }

    return newSiteRow;

}

// Function to create a site tile HTML element.
function createSiteTile(siteConfiguration, tileContainerID) {

    const siteTileTemplate = document.querySelector("#siteTileTemplate");
    const newSiteTile = document.importNode(siteTileTemplate.content, true);
    tileElement = newSiteTile.querySelector('.tile');
    tileElement.setAttribute('data-siteid', siteConfiguration.ID);
    tileElement.setAttribute('data-sitename', siteConfiguration.Name);
    tileElement.setAttribute('data-sitestatus', 9);
    tileElement.setAttribute('data-tilecontainer', tileContainerID);

    // <div class='tile__header-container'>

    newSiteTile.querySelector('.tile__id-text').innerText = siteConfiguration.ID;

    if (Array.isArray(siteConfiguration.Tags) && siteConfiguration.Tags.length > 0) {

        for (let i = 0; i < siteConfiguration.Tags.length; i++) {

            newSiteTile.querySelector('.tile__header-container').appendChild(createTag(siteConfiguration.Tags[i]));

            if (typeof siteConfiguration.Tags[i].Text !== 'string') {
                continue;
            }

            // We'll see if we can determine the status of the site based on tag keywords.
            switch (siteConfiguration.Tags[i].Text.toLowerCase()) {
                case 'online':
                    tileElement.setAttribute('data-sitestatus', '0');
                    tileElement.setAttribute('data-sitestatustext', 'online');
                    break;
                case 'slow':
                    tileElement.setAttribute('data-sitestatus', '1');
                    tileElement.setAttribute('data-sitestatustext', 'online slow');
                    break;
                case 'offline':
                    tileElement.setAttribute('data-sitestatus', '2');
                    tileElement.setAttribute('data-sitestatustext', 'offline');
            }

        }

    }

    // <div class='tile__body-container'>

    newSiteTile.querySelector('.tile__title-text').innerText = siteConfiguration.Name;
    if (typeof siteConfiguration.Description === 'string' && siteConfiguration.Description.length > 0) {
        newSiteTile.querySelector('.tile__subtitle-text').innerText = siteConfiguration.Description;
        tileElement.setAttribute('data-sitedescription', siteConfiguration.Description);
    } else {
        newSiteTile.querySelector('.tile__subtitle-text').remove();
    }

    // We'll add any status items to tile if specified.
    if (Array.isArray(siteConfiguration.Status) && siteConfiguration.Status.length > 0) {

        const statusContainerElement = newSiteTile.querySelector('.tile__status-container');

        for (let i = 0; i < siteConfiguration.Status.length; i++) {

            // We'll add a separator before the status item if this isn't the first item.
            if (i > 0) {
                const newStatusItemSeparator = document.createElement('div');
                newStatusItemSeparator.classList = 'tile__status-item-separator';
                statusContainerElement.appendChild(newStatusItemSeparator);
            }

            const statusConfigurationItem = siteConfiguration.Status[i];
            const newStatusItem = document.createElement('div');
            newStatusItem.classList = 'tile__status-item';

            // We'll add a tooltip to the status item (if one is specified).
            if (typeof statusConfigurationItem.Tooltip === 'string' && statusConfigurationItem.Tooltip.length > 0) {
                newStatusItem.setAttribute('data-tooltip', statusConfigurationItem.Tooltip);
            }

            // We'll add either an image or a title for the status item (if one is specified).
            if (typeof statusConfigurationItem.ImagePath === 'string' && statusConfigurationItem.ImagePath.length > 0) {
                const newStatusItemImage = document.createElement('div');
                newStatusItemImage.classList = 'tile__status-item-image-wrapper';
                newStatusItemImage.innerHTML = `<img src='${statusConfigurationItem.ImagePath}' alt='?'>`;
                newStatusItem.appendChild(newStatusItemImage);
            } else if (typeof statusConfigurationItem.TitleText === 'string' && statusConfigurationItem.TitleText.length > 0) {
                const newStatusItemTitle = document.createElement('div');
                newStatusItemTitle.classList = 'tile__status-item-title-text';
                newStatusItemTitle.innerHTML = statusConfigurationItem.TitleText;
                newStatusItem.appendChild(newStatusItemTitle);
            }

            // We'll add the value text for the status item (if one is specified).
            if (typeof statusConfigurationItem.ValueText === 'string' && statusConfigurationItem.ValueText.length > 0) {

                const newStatusItemText = document.createElement('div');
                newStatusItemText.classList = 'tile__status-item-text';

                if (statusConfigurationItem.SmallValueText === true) {
                    newStatusItemText.classList.add('tile__status-item-text--small');
                }

                // If a URL is specified for the status item, we'll make the value text a hyperlink.
                if (typeof statusConfigurationItem.Url === 'string' && statusConfigurationItem.Url.length > 0) {
                    const newStatusItemHyperlink = document.createElement('a');
                    newStatusItemHyperlink.innerHTML = statusConfigurationItem.ValueText;
                    newStatusItemHyperlink.setAttribute('href', statusConfigurationItem.Url);
                    if (typeof statusConfigurationItem.OpenUrlInNewTab === 'undefined' || statusConfigurationItem.OpenUrlInNewTab !== false) {
                        newStatusItemHyperlink.setAttribute('rel', 'noopener noreferrer');
                        newStatusItemHyperlink.setAttribute('target', '_blank');
                    }
                    newStatusItemText.appendChild(newStatusItemHyperlink);
                } else {
                    newStatusItemText.innerHTML = statusConfigurationItem.ValueText;
                }

                newStatusItem.appendChild(newStatusItemText);

            }

            statusContainerElement.appendChild(newStatusItem);

        }

    } else {
        newSiteTile.querySelector('.tile__status-container').remove();
    }

    // <div class='tile__image-container'>

    const newSiteImage = document.createElement('img');

    if (typeof siteConfiguration.ImagePath === 'string' && siteConfiguration.ImagePath.length > 0) {
        newSiteImage.classList.add(...createImageClassList(siteConfiguration));
        newSiteImage.setAttribute('src', siteConfiguration.ImagePath);
    } else {
        newSiteImage.classList.add('image--allow-brightness-control');
        newSiteImage.setAttribute('src', 'images/data-centre.svg');
    }

    newSiteImage.setAttribute('alt', '?');
    newSiteTile.querySelector('.tile__image-container').appendChild(newSiteImage);

    // <div class='tile__controls-container'>

    const controlsContainerElement = newSiteTile.querySelector('.tile__controls-container');
    let showControlsPlaceholderText = true;

    // We'll create the main hyperlinks in the controls container.
    if (typeof siteConfiguration.Hyperlink1 !== 'undefined' && siteConfiguration.Hyperlink1 !== null) {
        controlsContainerElement.appendChild(createHyperlink(siteConfiguration.Hyperlink1));
        showControlsPlaceholderText = false;
    }
    if (typeof siteConfiguration.Hyperlink2 !== 'undefined' && siteConfiguration.Hyperlink2 !== null) {
        controlsContainerElement.appendChild(createHyperlink(siteConfiguration.Hyperlink2));
        showControlsPlaceholderText = false;
    }

    // We'll add some placeholder text to the controls container if there aren't any hyperlinks.
    if (showControlsPlaceholderText) {
        const controlsContainerPlaceholder = document.createElement('div');
        controlsContainerPlaceholder.classList.add('tile__controls-container-placeholder');
        if (typeof siteConfiguration.HyperlinkPlaceholderText === 'string' && siteConfiguration.HyperlinkPlaceholderText.length > 0) {
            controlsContainerPlaceholder.innerText = siteConfiguration.HyperlinkPlaceholderText;
        } else {
            controlsContainerPlaceholder.innerText = 'No hyperlinks are available';
        }
        controlsContainerElement.appendChild(controlsContainerPlaceholder);
    }

    // We'll add a button and popup for any additional hyperlinks that are specified.
    if (Array.isArray(siteConfiguration.AdditionalHyperlinks) && siteConfiguration.AdditionalHyperlinks.length > 0) {
        const hyperlinkPopupTemplate = document.querySelector("#hyperlinkPopupTemplate");
        const newHyperlinkPopup = document.importNode(hyperlinkPopupTemplate.content, true);
        for (let i = 0; i < siteConfiguration.AdditionalHyperlinks.length; i++) {
            newHyperlinkPopup.querySelector('.hyperlink-popup__content-container').appendChild(createHyperlink(siteConfiguration.AdditionalHyperlinks[i]));
        }
        controlsContainerElement.appendChild(newHyperlinkPopup);
    }

    // We'll add a separator to separate hyperlinks and other controls.
    const newControlsContainerSeparator = document.createElement('div');
    newControlsContainerSeparator.classList.add('tile__controls-container-separator');
    controlsContainerElement.appendChild(newControlsContainerSeparator);

    // We'll add a button to show any additional details that are specified.
    if (Array.isArray(siteConfiguration.AdditionalDetails) && siteConfiguration.AdditionalDetails.length > 0) {
        const additionalDetailsButtonTemplate = document.querySelector("#additionalDetailsButtonTemplate");
        const newAdditionalDetailsButton = document.importNode(additionalDetailsButtonTemplate.content, true);
        const newAdditionalDetailsButtonElement = newAdditionalDetailsButton.querySelector('.tile__show-details-button');
        newAdditionalDetailsButtonElement.setAttribute('data-siteid', siteConfiguration.ID);
        newAdditionalDetailsButtonElement.setAttribute('data-sitename', siteConfiguration.Name);
        newAdditionalDetailsButtonElement.setAttribute('data-siteimage', newSiteImage.outerHTML);
        newAdditionalDetailsButtonElement.setAttribute('data-sitedetails', JSON.stringify(siteConfiguration.AdditionalDetails));
        controlsContainerElement.appendChild(newAdditionalDetailsButton);
    }

    // We'll add a pin/unpin button.
    const pinButtonTemplate = document.querySelector("#pinButtonTemplate");
    const newPinButton = document.importNode(pinButtonTemplate.content, true);
    newPinButton.querySelector('.tile__pin-button').setAttribute('data-siteid', siteConfiguration.ID);
    controlsContainerElement.appendChild(newPinButton);

    return newSiteTile;

}

// Function to create a tag HTML element.
function createTag(tagConfiguration, allowHyperlinks = true, allowTooltips = true) {

    let tagColour;
    let tagImagePath;
    let isCustomStyleApplied = false;
    let isHyperlink = (allowHyperlinks && typeof tagConfiguration.Url === 'string' && tagConfiguration.Url.length > 0);

    const newTag = document.createElement(isHyperlink ? 'a' : 'div');
    newTag.classList = 'tag';

    if (isHyperlink) {
        newTag.setAttribute('href', tagConfiguration.Url);
        if (typeof tagConfiguration.OpenUrlInNewTab === 'undefined' || tagConfiguration.OpenUrlInNewTab !== false) {
            newTag.setAttribute('rel', 'noopener noreferrer');
            newTag.setAttribute('target', '_blank');
        }
    }

    if (allowTooltips && typeof tagConfiguration.Tooltip === 'string' && tagConfiguration.Tooltip.length > 0) {
        newTag.setAttribute('data-tooltip', tagConfiguration.Tooltip);
    }

    if (typeof tagConfiguration.ImagePath === 'string' && tagConfiguration.ImagePath.length > 0) {
        tagImagePath = tagConfiguration.ImagePath;
        isCustomStyleApplied = true;
    }

    if (typeof tagConfiguration.Colour === 'string' && tagConfiguration.Colour.length > 0) {
        tagColour = tagConfiguration.Colour;
        isCustomStyleApplied = true;
    }

    if (typeof tagConfiguration.Text === 'string' && tagConfiguration.Text.length > 0) {

        const newTagSpan = document.createElement('span');
        newTagSpan.innerText = tagConfiguration.Text;
        newTag.appendChild(newTagSpan);

        // If no custom style has been applied, we'll check if the text is a keyword which should have a special style applied.
        if (!isCustomStyleApplied) {
            switch (tagConfiguration.Text.toLowerCase()) {
                case 'online':
                    tagColour = 'green';
                    tagImagePath = 'images/online.svg';
                    break;
                case 'slow':
                    tagColour = 'yellow';
                    tagImagePath = 'images/slow.svg';
                    break;
                case 'offline':
                    tagColour = 'red';
                    tagImagePath = 'images/offline.svg';
            }
        }

    }

    // If a tag colour is specified we'll add the appropriate colour class to the tag.
    if (tagColour) {
        switch (tagColour.toLowerCase()) {
            case 'green':
                newTag.classList.add('tag--green');
                break;
            case 'yellow':
                newTag.classList.add('tag--yellow');
                break;
            case 'red':
                newTag.classList.add('tag--red');
        }
    }

    // If an image path is specified we'll add the image as the tag's first child element.
    if (tagImagePath) {
        const newTagImage = document.createElement('img');
        newTagImage.setAttribute('src', tagImagePath);
        newTagImage.setAttribute('alt', '?');
        newTag.prepend(newTagImage);
    }

    return newTag;

}

// Function to create a tile container HTML element.
function createTileContainer(siteListConfiguration) {

    const tileContainerID = `tileContainer${tileContainerCount.toString()}`;
    tileContainerCount++;

    const tileContainerTemplate = document.querySelector("#tileContainerTemplate");
    const newTileContainer = document.importNode(tileContainerTemplate.content, true);
    newTileContainer.querySelector('.dashboard-view__tile-container').setAttribute('id', tileContainerID);

    for (let i = 0; i < siteListConfiguration.length; i++) {
        newTileContainer.querySelector('.dashboard-view__tile-container').appendChild(createSiteTile(siteListConfiguration[i], tileContainerID));
    }

    return newTileContainer;

}

// #endregion HTML Element Creation Functions