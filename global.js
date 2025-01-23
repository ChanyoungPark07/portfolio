let pages = [
    {url: 'index.html', title: 'Home'},
    {url: 'projects/index.html', title: 'Projects'},
    {url: 'contact/index.html', title: 'Contact'},
    {url: 'resume/index.html', title: 'Resume'},
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