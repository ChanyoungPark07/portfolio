let data = [];
let commits = [];
let filteredCommits = [];
let xScale = null;
let yScale = null;
let commitMaxTime = null;

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
  
  // Sort commits by datetime for proper scrolling timeline
  commits = commits.sort((a, b) => a.datetime - b.datetime);
  
  // Initialize filteredCommits with all commits
  filteredCommits = [...commits];
}

// Filter commits by time
function filterCommitsByTime() {
  if (!commitMaxTime) {
      filteredCommits = [...commits];
  } else {
      filteredCommits = commits.filter(commit => 
          commit.datetime <= commitMaxTime
      );
  }
  
  // Update stats and visualizations based on filtered data
  updateStats();
  updateScatterplot(filteredCommits);
  updateLanguageBreakdown();
  displayCommitFiles();
}

// Display commit stats
function displayStats() {
  processCommits();
  
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');
  updateStats(dl);
}

// Update stats based on filtered commits
function updateStats(dlContainer = null) {
  // Get or create the container
  const dl = dlContainer || d3.select('#stats dl');
  
  // Clear existing stats if we're updating
  if (!dlContainer) {
      dl.html('');
  }

  dl.append('dt').text('Total Commits');
  dl.append('dd').text(filteredCommits.length);

  // Get unique files from lines in filtered commits
  const filesFromFilteredCommits = new Set(
      filteredCommits.flatMap(commit => commit.lines)
                      .map(line => line.file)
  );
  
  dl.append('dt').text('Number of Files');
  dl.append('dd').text(filesFromFilteredCommits.size);

  const totalLines = filteredCommits.flatMap(commit => commit.lines).length;
  dl.append('dt').html('Total Lines of Code');
  dl.append('dd').text(totalLines);

  const longestLineLength = d3.max(
      filteredCommits.flatMap(commit => commit.lines), 
      d => d.length
  );
  dl.append('dt').text('Longest Line');
  dl.append('dd').text(longestLineLength || 0);

  // Calculate day of most work based on filtered commits
  const commitLinesByDay = d3.rollup(
      filteredCommits.flatMap(commit => commit.lines),
      v => v.length,
      d => new Date(d.datetime).getDay()
  );
  
  if (commitLinesByDay.size > 0) {
      const mostWorkDayOfWeek = Array.from(commitLinesByDay)
          .reduce((a, b) => a[1] > b[1] ? a : b)[0];
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      dl.append('dt').text('Day of Most Work');
      dl.append('dd').text(days[mostWorkDayOfWeek]);
  } else {
      dl.append('dt').text('Day of Most Work');
      dl.append('dd').text('No data');
  }
}

// Update scatter plot based on filtered commits
function updateScatterplot(commitData) {
  d3.select('#chart svg').remove();
  
  const width = 800;
  const height = 500;
  const margin = { top: 20, right: 30, bottom: 50, left: 50 };
  const usableArea = {
      top: margin.top,
      right: width - margin.right,
      bottom: height - margin.bottom,
      left: margin.left,
      width: width - margin.left - margin.right,
      height: height - margin.top - margin.bottom,
  };

  const svg = d3
      .select('#chart')
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('overflow', 'visible');

  if (!commitData || commitData.length === 0) {
      svg.append('text')
          .attr('x', width / 2)
          .attr('y', height / 2)
          .attr('text-anchor', 'middle')
          .text('No commits available for the selected time period');
      return;
  }

  // Update scales with new ranges
  xScale = d3
      .scaleTime()
      .domain(d3.extent(commitData, (d) => d.datetime))
      .range([usableArea.left, usableArea.right])
      .nice();

  yScale = d3
      .scaleLinear()
      .domain([0, 24])
      .range([usableArea.bottom, usableArea.top]);

  const [minLines, maxLines] = d3.extent(commitData, (d) => d.totalLines);
  const rScale = d3
      .scaleSqrt()
      .domain([minLines || 1, maxLines || 10])
      .range([3, 30]);

  // Sort commits by total lines in descending order
  const sortedCommits = d3.sort(commitData, (d) => -d.totalLines);

  // Add gridlines
const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .style('stroke-opacity', 0.25);

  // Create gridlines as an axis with no labels and full-width ticks
  gridlines.call(
      d3.axisLeft(yScale)
          .tickFormat('')
          .tickSize(-usableArea.width)
  );
  
  // Create the axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3
      .axisLeft(yScale)
      .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  // Add X axis
  svg
      .append('g')
      .attr('transform', `translate(0, ${usableArea.bottom})`)
      .call(xAxis)
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .attr('text-anchor', 'end')
      .attr('dx', '-0.8em')
      .attr('dy', '0.15em');

  // Add Y axis
  svg
      .append('g')
      .attr('transform', `translate(${usableArea.left}, 0)`)
      .call(yAxis);

  // Add a dots group and raise it above gridlines
  const dots = svg.append('g').attr('class', 'dots');
  dots.raise();
  
  dots
      .selectAll('circle')
      .data(sortedCommits)
      .join('circle')
      .attr('cx', (d) => xScale(d.datetime))
      .attr('cy', (d) => yScale(d.hourFrac))
      .attr('r', (d) => rScale(d.totalLines))
      .style('fill-opacity', 0.6)
      .attr('fill', 'steelblue')
      .attr('data-commit-id', (d) => d.id) // Add data attribute for easier selection
      .on('mouseenter', (event, commit) => {
          d3.select(event.currentTarget).style('fill-opacity', 1);
          updateTooltipContent(commit);
          updateTooltipVisibility(true);
          updateTooltipPosition(event);
          d3.select(event.currentTarget).classed('selected', isCommitSelected(commit));
      })
      .on('mouseleave', (event, commit) => {
          d3.select(event.currentTarget).style('fill-opacity', 0.6);
          updateTooltipVisibility(false);
          d3.select(event.currentTarget).classed('selected', isCommitSelected(commit));
      });
  
  // Reset brush selection since we've redrawn the chart
  brushSelection = null;
  selectedCommits = [];
  
  // Add brush after redrawing
  brushSelector();
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
  const tooltipWidth = tooltip.offsetWidth;
  const tooltipHeight = tooltip.offsetHeight;
  const pageWidth = window.innerWidth;
  const pageHeight = window.innerHeight;

  let left = event.clientX + 10;
  let top = event.clientY + 10;

  if (left + tooltipWidth > pageWidth) {
    left = event.clientX - tooltipWidth - 10;
  }

  if (top + tooltipHeight > pageHeight) {
    top = event.clientY - tooltipHeight - 10;
  }

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

// Brushing
let brushSelection = null;
let selectedCommits = [];

function brushSelector() {
  const svg = document.querySelector('svg');
  if (!svg) return;
  
  d3.select(svg).call(d3.brush().on('start brush end', brushed));
  d3.select(svg).selectAll('.dots, .overlay ~ *').raise();
}

function brushed(evt) {
  brushSelection = evt.selection;
  selectedCommits = !brushSelection
  ? []
  : filteredCommits.filter((commit) => {
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
  const displayCommits = selectedCommits;

  const countElement = document.getElementById('selection-count');
  countElement.textContent = `${displayCommits.length || 'No'} commits selected`;

  return displayCommits;
}

function updateLanguageBreakdown() {
  const container = document.getElementById('language-breakdown');
  
  const commitsToAnalyze = selectedCommits.length ? selectedCommits : filteredCommits;
  
  if (commitsToAnalyze.length === 0) {
      container.innerHTML = '';
      return;
  }
  
  const lines = commitsToAnalyze.flatMap((d) => d.lines);

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

// Display commit files
function displayCommitFiles() {
  const lines = filteredCommits.flatMap((d) => d.lines);
  let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);
  let files = d3.groups(lines, (d) => d.file).map(([name, lines]) => {
    return { name, lines };
  });
  files = d3.sort(files, (d) => -d.lines.length);
  d3.select('.files').selectAll('div').remove();
  let filesContainer = d3.select('.files').selectAll('div').data(files).enter().append('div');
  filesContainer.append('dt').html(d => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);
  filesContainer.append('dd')
                .selectAll('div')
                .data(d => d.lines)
                .enter()
                .append('div')
                .attr('class', 'line')
                .style('background', d => fileTypeColors(d.type));
}

// Setup scroll container
function setupScrollContainer() {
  const NUM_ITEMS = commits.length;
  const ITEM_HEIGHT = 100;
  const VISIBLE_COUNT = Math.min(10, commits.length);
  const totalHeight = NUM_ITEMS * ITEM_HEIGHT;
  
  const scrollContainer = d3.select('#scroll-container');
  const spacer = d3.select('#spacer');
  const itemsContainer = d3.select('#items-container');
  
  // Set appropriate spacer height
  spacer.style('height', `${totalHeight}px`);
  
  // Clear existing items
  itemsContainer.selectAll('*').remove();
  
  // Set up scroll event
  scrollContainer.on('scroll', () => {
      const scrollTop = scrollContainer.property('scrollTop');
      let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
      startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
      
      updateTimeFilterFromScroll(startIndex);
      renderItems(startIndex);
  });
  
  // Initial render
  renderItems(0);
  
  // Set initial time filter to the first commit's datetime
  if (commits.length > 0) {
    commitMaxTime = commits[0].datetime;
    filterCommitsByTime();
  }
}

function updateTimeFilterFromScroll(startIndex) {
  if (commits.length === 0) return;
  
  const visibleIndex = Math.min(startIndex, commits.length - 1);
  commitMaxTime = commits[visibleIndex].datetime;

  filterCommitsByTime();
  highlightCurrentCommit(commits[visibleIndex].id);
}

// Highlight the current commit in the scatter plot
function highlightCurrentCommit(commitId) {
  d3.selectAll('circle')
    .style('fill-opacity', 0.6)
    .attr('stroke', 'none')
    .attr('stroke-width', 0);
  
  // Highlight the current commit dot
  d3.selectAll(`circle[data-commit-id="${commitId}"]`)
    .style('fill-opacity', 1)
    .attr('stroke', '#333')
    .attr('stroke-width', 2);
}

// Render items with the specific format
function renderItems(startIndex) {
  const ITEM_HEIGHT = 100;
  const VISIBLE_COUNT = Math.min(10, commits.length);
  const itemsContainer = d3.select('#items-container');
  
  // Clear existing items
  itemsContainer.selectAll('*').remove();
  
  const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
  const visibleCommits = commits.slice(startIndex, endIndex);
  
  // Create item containers with appropriate spacing
  const items = itemsContainer
      .selectAll('div.item')
      .data(visibleCommits)
      .enter()
      .append('div')
      .attr('class', 'item')
      .style('position', 'absolute')
      .style('top', (_, idx) => `${idx * ITEM_HEIGHT}px`)
      .style('left', '0')
      .style('right', '0')
      .style('height', '100px')
      .style('padding', '15px')
      .style('margin-bottom', '10px')
      .style('border-bottom', '1px solid #eee')
      .style('overflow', 'hidden')
      .style('border-radius', '4px')
      .style('box-shadow', '0 1px 3px rgba(0,0,0,0.1)');
  
  // Add formatted content to each commit item using the requested format
  items.html((commit, index) => `
    <p class="commit-description" style="font-size: 16px; line-height: 1.5; margin-bottom: 8px;">
      On ${commit.datetime.toLocaleString("en", {dateStyle: "full", timeStyle: "short"})}, I made
      <a href="${commit.url}" target="_blank" style="color: #0366d6; text-decoration: none;">
        ${index > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'}
      </a>. I edited ${commit.totalLines} lines across ${d3.rollups(commit.lines, D => D.length, d => d.file).length} files. Then I looked over all I had made, and
      I saw that it was very good.
    </p>
  `);
  
  // Update the highlighted commit in the scatter plot when hovering
  items.on('mouseenter', (event, commit) => {
    highlightCurrentCommit(commit.id);
  });
}

// Main
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    processCommits();
    setupScrollContainer();
});