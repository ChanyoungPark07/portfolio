let data = [];
let commits = [];
let xScale = null;
let yScale = null;
let timeScale = null; // Declare timeScale but don't initialize yet

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

    xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([0, width])
    .nice();

    yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([3, 30]);

    // Sort commits by total lines in descending order
    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

    const dots = svg.append('g').attr('class', 'dots');
    dots
    .selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .style('fill-opacity', 0.6)
    .attr('fill', 'steelblue')
    .on('mouseenter', (event, commit) => {
        d3.select(event.currentTarget).style('fill-opacity', 1)
        updateTooltipContent(commit);
        updateTooltipVisibility(true);
        updateTooltipPosition(event);
        d3.select(event.currentTarget).classed('selected', isCommitSelected(commit));
      })
    .on('mouseleave', (event, commit) => {
        d3.select(event.currentTarget).style('fill-opacity', 0.6);
        updateTooltipContent({});
        updateTooltipVisibility(false);
        d3.select(event.currentTarget).classed('selected', isCommitSelected(commit));
      });
    
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

// Brushing
let brushSelection = null;
let selectedCommits = [];

function brushSelector() {
    const svg = document.querySelector('svg');
    d3.select(svg).call(d3.brush().on('start brush end', brushed));
    d3.select(svg).selectAll('.dots, .overlay ~ *').raise();
}

function brushed(evt) {
  brushSelection = evt.selection;
  selectedCommits = !brushSelection
    ? []
    : commits.filter((commit) => {
        let min = { x: brushSelection[0][0], y: brushSelection[0][1] };
        let max = { x: brushSelection[1][0], y: brushSelection[1][1] };
        let x = xScale(commit.datetime);
        let y = yScale(commit.hourFrac);

        return x >= min.x && x <= max.x && y >= min.y && y <= max.y;
      });

  updateSelection();
  updateLanguageBreakdown();
}

function isCommitSelected(commit) {
  return selectedCommits.includes(commit);
}

function updateSelection() {
  // Update visual state of dots based on selection
  d3.selectAll('circle').classed('selected', (d) => isCommitSelected(d));
  const selectedCommits = brushSelection ? commits.filter(isCommitSelected) : [];

  const countElement = document.getElementById('selection-count');
  countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;

  return selectedCommits;
}

function updateLanguageBreakdown() {
    const selectedCommits = brushSelection ? commits.filter(isCommitSelected) : [];
    const container = document.getElementById('language-breakdown');
  
    if (selectedCommits.length === 0) {
      container.innerHTML = '';
      return;
    }
    const requiredCommits = selectedCommits.length ? selectedCommits : commits;
    const lines = requiredCommits.flatMap((d) => d.lines);
  
    // Use d3.rollup to count lines per language
    const breakdown = d3.rollup(
      lines,
      (v) => v.length,
      (d) => d.type
    );
  
    // Update DOM with breakdown
    container.innerHTML = '';
  
    for (const [language, count] of breakdown) {
      const proportion = count / lines.length;
      const formatted = d3.format('.1~%')(proportion);

      container.innerHTML += `
              <dt>${language}</dt>
              <dd>${count} lines (${formatted})</dd>
          `;
    }
}

// Initialize slider
function initializeSlider() {
    // Only initialize timeScale after commits are loaded
    timeScale = d3.scaleTime()
        .domain([
            d3.min(commits, d => d.datetime),
            d3.max(commits, d => d.datetime)
        ])
        .range([0, 100]);
    
    let commitProgress = 100;
    const selectedTime = d3.select('#selectedTime');
    
    // Format the date with the specified format
    const formatDate = (date) => {
        return date.toLocaleString('default', {
            dateStyle: 'long',
            timeStyle: 'short'
        });
    };
    
    // Initial date display
    selectedTime.text(formatDate(timeScale.invert(commitProgress)));
    
    const slider = document.getElementById('commit-slider');
    
    slider.addEventListener('input', () => {
        commitProgress = parseInt(slider.value);
        let newDate = timeScale.invert(commitProgress);
        selectedTime.text(formatDate(newDate));
    });
}

// Main
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    createScatterplot();
    brushSelector();
    initializeSlider(); // Initialize the slider after data is loaded
});