import { fetchJSON, renderProjects } from '../global.js';

// Fetch and render project data
const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');

renderProjects(projects, projectsContainer, 'h2');


// Display number of projects
const projectsTitle = document.querySelector('.projects-title');
const h1Title = projectsTitle.querySelector('h1')
h1Title.innerHTML = `${projects.length} Projects`;