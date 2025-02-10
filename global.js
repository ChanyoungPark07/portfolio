// Navigation bar
let pages = [
    {url: 'index.html', title: 'Home'},
    {url: 'projects/index.html', title: 'Projects'},
    {url: 'contact/index.html', title: 'Contact'},
    {url: 'resume/index.html', title: 'Resume'},
    {url: 'meta/index.html', title: 'Meta'},
    {url: 'https://github.com/ChanyoungPark07', title: 'GitHub'}
  ];

let nav = document.createElement('nav');
document.body.prepend(nav);
const ARE_WE_HOME = document.documentElement.classList.contains('home');

for (let p of pages) {
    let url = p.url;
    url = !ARE_WE_HOME && !url.startsWith('http') ? '../' + url : url;
    let title = p.title;

    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
    nav.append(a);

    if (a.host === location.host && a.pathname === location.pathname) {
        a.classList.add('current');
        }

    if (a.host !== location.host) {
        a.target = '_blank';
        }
  }


// Switch between light and dark modes
document.body.insertAdjacentHTML(
'afterbegin',
`
    <label class="color-scheme">
        Theme:
        <select>
            <option value="light dark">Automatic</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
        </select>
    </label>`
);

let select = document.querySelector('select')
if ("colorScheme" in localStorage) {
    select.value = localStorage.colorScheme
    document.documentElement.style.setProperty('color-scheme', localStorage.colorScheme);
}

select.addEventListener('input', function (event) {
    console.log('color scheme changed to', event.target.value);
    document.documentElement.style.setProperty('color-scheme', event.target.value);
    localStorage.colorScheme = event.target.value;
  });


//Correctly format form submission email
let form = document.querySelector('form')
form?.addEventListener('submit', function (event) {
    event.preventDefault();
    let data = new FormData(form);
    let url = form.action + '?'
    for (let [name, value] of data) {
        url += `${encodeURIComponent(name)}=${encodeURIComponent(value)}&`;
      }
    location.href = url;
  });


// Fetch project data
export async function fetchJSON(url) {
  try {
    // Fetch the JSON file from the given URL
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } 
  catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}


// Render projects
export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!(containerElement instanceof HTMLElement)) {
    console.error('Invalid container element:', containerElement);
    return;
  }

  const heading = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
  if (!(heading.includes(headingLevel))) {
    console.error('Invalid heading level:', headingLevel);
    headingLevel = 'h2';
  }

  containerElement.innerHTML = '';

  for (let project of projects) {
    const article = document.createElement('article');
    const {title='Untitled Project', image='', description='Description Unavailable'} = project;

    article.innerHTML = `
      <${headingLevel}>${project.title}</${headingLevel}>
      <img src="${project.image}" alt="${project.title}">
      <p>${project.year} | ${project.description}</p>
    `;
    containerElement.appendChild(article);
  }
}


// Fetch GitHub data
export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}