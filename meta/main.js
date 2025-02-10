let data = [];
let commits = [];

// Load data
async function loadData() {
    data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));

    displayStats();
}

// Process commits
function processCommits() {
    commits = d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
        let first = lines[0];
        let { author, date, time, timezone, datetime } = first;
        let ret = {
            id: commit,
            url: 'https://github.com/vis-society/lab-7/commit/' + commit,
            author,
            date,
            time,
            timezone,
            datetime,
            hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
            totalLines: lines.length,
        };

        Object.defineProperty(ret, 'lines', {
            value: lines,
            configurable: true,
            writable: true,
            enumerable: true,
        });

        return ret;
    });
}

// Display commit stats
function displayStats() {
    processCommits();
  
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');
  
    dl.append('dt').text('Total Commits');
    dl.append('dd').text(commits.length);

    const numberOfFiles = new Set(data.map(d => d.file)).size;
    dl.append('dt').text('Number of Files');
    dl.append('dd').text(numberOfFiles);

    dl.append('dt').html('Total Lines of Code');
    dl.append('dd').text(data.length);

    const longestLineLength = d3.max(data, d => d.length);
    dl.append('dt').text('Longest Line');
    dl.append('dd').text(longestLineLength);

    const dayOfWeek = d3.rollup(data, v => v.length, d => new Date(d.datetime).getDay());
    const mostWorkDayOfWeek = Array.from(dayOfWeek).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    dl.append('dt').text('Day of Most Work');
    dl.append('dd').text(days[mostWorkDayOfWeek]);
}

// Scatter plot
function createScatterplot() {
    const width = 1000;
    const height = 600;

    const svg = d3
    .select('#chart')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('overflow', 'visible');

    const xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([0, width])
    .nice();

    const yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

    const dots = svg.append('g').attr('class', 'dots');
    dots
    .selectAll('circle')
    .data(commits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', 5)
    .attr('fill', 'steelblue')
    .on('mouseenter', (event, commit) => {
        updateTooltipContent(commit);
        updateTooltipVisibility(true);
        updateTooltipPosition(event);
      })
      .on('mouseleave', () => {
        updateTooltipContent({});
        updateTooltipVisibility(false);
      })

    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
      };
      
    // Update scales with new ranges
    xScale.range([usableArea.left, usableArea.right]);
    yScale.range([usableArea.bottom, usableArea.top]);

    // Add gridlines
    const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .style('stroke-opacity', 0.25);

    // Create gridlines as an axis with no labels and full-width ticks
    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));
    
    // Create the axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale).tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    // Add X axis
    svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

    // Add Y axis
    svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);
}

// Tooltip
function updateTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time');
    const author = document.getElementById('commit-author');
    const edited = document.getElementById('commit-edited');
  
    if (Object.keys(commit).length === 0) return;
  
    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', {
      dateStyle: 'full',
    });
    time.textContent = commit.datetime?.toLocaleString('en', {
        timeStyle: 'short',
    });
    author.textContent = commit.author
    edited.textContent = commit.lines.length;
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    createScatterplot();
});