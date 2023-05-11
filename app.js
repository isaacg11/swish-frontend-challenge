/**
 * Send http request for endpoint data
 * @param endpoint
*/
async function request(endpoint) {
    return fetch(endpoint)
        .then(response => response.json())
        .catch(error => console.error(error));
}

/**
 * Filters data by search
 * @param markets
 * @param filterValue
*/
async function filterBySearch(markets, filterValue) {
    let filteredResults = [];
    filteredResults = markets.filter((market) => {
        const playerName = new RegExp(filterValue, 'gi');
        const teamName = new RegExp(filterValue, 'gi');
        return (playerName.test(market.playerName) || teamName.test(market.teamNickname));
    })

    return filteredResults;
}

/**
 * Filters data by position
 * @param markets
 * @param filterValue
*/
async function filterByPosition(markets, filterValue) {
    let filteredResults = [];
    filteredResults = markets.filter((market) => (market.position === filterValue));
    return filteredResults;
}

/**
 * Filters data by market status
 * @param markets
 * @param filterValue
 * @param statTypeFilterValue
*/
async function filterByMarketStatus(markets, filterValue, statTypeFilterValue) {
    let filteredResults = [];
    filteredResults = markets.filter((market) => {
        if (statTypeFilterValue) {
            if (market.statTypeId === parseInt(statTypeFilterValue)) {
                if (parseInt(filterValue) === 1 && market.isSuspended) {
                    return true;
                } else if (parseInt(filterValue) === 0 && !market.isSuspended) {
                    return true;
                } else {
                    return false;
                }
            }
        } else {
            if (parseInt(filterValue) === 1 && market.isSuspended) {
                return true;
            } else if (parseInt(filterValue) === 0 && !market.isSuspended) {
                return true;
            } else {
                return false;
            }
        }
    });

    return filteredResults;
}

/**
 * Requests new data to populate and render the table
*/
async function getData() {

    // get table data
    let markets = await request('props.json');
    let altData = await request('alternates.json');

    // get input values
    const searchFilterValue = document.getElementById('search-input').value;
    const positionFilterValue = document.getElementById('position').value;
    const statTypeFilterValue = document.getElementById('stat-type').value;
    const marketStatusFilterValue = document.getElementById('market-status').value;

    markets.forEach((market) => {

        // marketSuspended = 1 for that market in props.json
        if (market.marketSuspended) {
            market.isSuspended = true;
        }

        let playerData = altData.filter((data) => (data.playerId === market.playerId));
        let optimalLineMatch = playerData.find((data) => data.line === market.line);

        // Check to see if there was an optimal line match found OR
        // the market exists in alternates.json, but none of the 3 probabilities for the optimal line are greater than 40%.
        if (
            !optimalLineMatch ||
            (optimalLineMatch.underOdds < 0.4 &&
                optimalLineMatch.overOdds < 0.4 &&
                optimalLineMatch.pushOdds < 0.4)
        ) {
            market.isSuspended = true;
        }

        // Check for manually set market status
        const marketStatusOverride = localStorage.getItem(`${market.playerId}-${market.statTypeId}`);
        if (marketStatusOverride) {
            const playerInfo = JSON.parse(marketStatusOverride);
            if (market.statTypeId === playerInfo.statTypeId) {
                market.isSuspended = (playerInfo.status === 'suspended');
            }
        }

        // set "high" and "low" data points
        altData.forEach((data) => {
            if (market.statTypeId === data.statTypeId && market.playerId === data.playerId) {
                if (market.low && market.high) {
                    if (data.line < market.low) market.low = data.line;
                    if (data.line > market.high) market.high = data.line;
                } else {
                    market.low = data.line;
                    market.high = data.line;
                }
            }
        })
    })

    // filter data
    if (searchFilterValue) {
        markets = await filterBySearch(markets, searchFilterValue);
    }

    if (positionFilterValue) {
        markets = await filterByPosition(markets, positionFilterValue);
    }

    if (marketStatusFilterValue) {
        markets = await filterByMarketStatus(markets, marketStatusFilterValue, statTypeFilterValue);
    }

    // Check for existing table
    const existingTable = document.getElementById('main-table');
    if (existingTable) {

        // Remove the table
        existingTable.remove();
    }

    // Get a reference to the element where you want to insert the table
    const tableContainer = document.getElementById('table-container');

    if (markets.length > 0) {

        // Create a table element
        const table = document.createElement('table');

        // set table id
        table.setAttribute('id', 'main-table');

        // Loop over the market data
        markets.forEach((market, index) => {

            // Check to see if starting a new player's market
            if (index === 0 || (index !== 0 && market.playerName !== markets[index - 1].playerName)) {

                // Create a row for the player info
                const row1 = document.createElement('tr');

                // Create table data cell
                const player = document.createElement('td');
                player.setAttribute('class', 'player');
                player.textContent = market.playerName;
                row1.appendChild(player);

                // Add the row to the table
                table.appendChild(row1);

                // create a row for the player info
                const row2 = document.createElement('tr');

                // Create table data cell
                const team = document.createElement('td');
                team.setAttribute('class', 'team');
                team.textContent = market.teamNickname;
                row2.appendChild(team);

                // Add the row to the table
                table.appendChild(row2);

                // Create a table header row
                const headerRow = document.createElement('tr');

                const headerTypes = ['market', 'line', 'high', 'low', 'suspended?'];
                headerTypes.forEach((headerType) => {

                    // Create table header cells
                    const header = document.createElement('th');
                    header.textContent = headerType;
                    headerRow.appendChild(header);
                })

                // Add header row to the table
                table.appendChild(headerRow);
            }


            // check to see if row should be rendered
            let renderRow = true;
            if (statTypeFilterValue) {
                if (market.statTypeId !== parseInt(statTypeFilterValue)) {
                    renderRow = false;
                }
            }

            if (marketStatusFilterValue) {
                if (parseInt(marketStatusFilterValue) === 1 && !market.isSuspended) {
                    renderRow = false;
                } else if (parseInt(marketStatusFilterValue) === 0 && market.isSuspended) {
                    renderRow = false;
                }
            }

            if (renderRow) {
                // create a row for each object
                const row = document.createElement('tr');

                const dataTypes = ['statType', 'line', 'high', 'low', 'isSuspended'];
                dataTypes.forEach((dataType) => {

                    if (dataType === 'isSuspended') {

                        // Create checkbox container
                        const checkboxContainer = document.createElement('td');

                        // Create a checkbox element
                        let checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.id = 'checkbox-input';
                        checkbox.checked = market[dataType];

                        // Create a label for the checkbox
                        let label = document.createElement('label');
                        label.htmlFor = 'checkbox-input';
                        label.appendChild(document.createTextNode('Check me:'));

                        checkboxContainer.appendChild(checkbox);

                        // Append the checkbox and label to the container element
                        row.appendChild(checkboxContainer);

                        // Add an event listener to the checkbox
                        checkbox.addEventListener('change', function () {
                            const marketStatus = (market.isSuspended) ? 'active' : 'suspended';
                            const override = { statTypeId: market.statTypeId, status: marketStatus }
                            localStorage.setItem(`${market.playerId}-${market.statTypeId}`, JSON.stringify(override));
                            getData();
                        });
                    } else {
                        // Create table data cells
                        const statType = document.createElement('td');
                        statType.textContent = market[dataType];
                        row.appendChild(statType);
                    }
                })

                // Add the row to the table
                table.appendChild(row);
            }
        });

        // Insert the table into the container element
        tableContainer.appendChild(table);
    } else {

        // Create an empty div
        const div = document.createElement('div');

        // set div id
        div.setAttribute('id', 'main-table');

        // Create a header element
        const header = document.createElement('h3');
        header.textContent = 'No data found';
        div.appendChild(header);

        // Create a text element
        const text = document.createElement('p');
        text.textContent = 'There were no results returned from your query';
        div.appendChild(text);

        // Insert the div into the container element
        tableContainer.appendChild(div);
    }
}

// on page init, get data for table
getData();

