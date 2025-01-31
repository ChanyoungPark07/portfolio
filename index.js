import { fetchJSON, renderProjects, fetchGitHubData } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const latestProjects = projects.slice(0, 3);

const projectsContainer = document.querySelector('.projects');
renderProjects(latestProjects, projectsContainer, 'h2');

const githubData = await fetchGitHubData('ChanyoungPark07');
const profileStats = document.querySelector('#profile-stats');

if (profileStats) {
    profileStats.innerHTML = `
        <dl>
        <dt>SINCE</dt><dd>${githubData.created_at.split('T')[0]}</dd>
        <dt>FOLLOWERS</dt><dd>${githubData.followers}</dd>
        <dt>FOLLOWING</dt><dd>${githubData.following}</dd>
        <dt>PUBLIC REPOS</dt><dd>${githubData.public_repos}</dd>
        </dl>
    `;
  }