/* Skill constellation: projects on one side, skills on the other, joined by curved links.
   It is drawn with D3 as the interactive background of the Skills section heading. */
(() => {
  'use strict';

  const host = document.getElementById('constellation');
  if (!host) return;
  const head = document.getElementById('constellationHead');
  const info = document.getElementById('constellationInfo');
  const title = head.querySelector('h2');
  // If D3 could not be loaded, drop the background; the heading and skill chips are unaffected.
  if (!window.d3) {
    host.hidden = true;
    info.hidden = true;
    head.classList.remove('section__head--constellation');
    return;
  }

  const d3 = window.d3;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const defaultInfo = info.textContent;

  // To update: add a project here with the skills it used, and add any new skill to skillOrder.
  const projects = [
    { name: 'XageCare', skills: ['React', 'JavaScript', 'Spring Boot', 'Java', 'PostgreSQL', 'REST APIs'] },
    { name: 'Internal Apps', skills: ['Angular', 'Java', 'Spring Boot', 'REST APIs', 'Postman', 'Figma'] },
    { name: 'Insurance Platform', skills: ['AngularJS', 'Angular', 'TypeScript', 'Java', 'Spring Boot', 'PostgreSQL', 'Oracle', 'Jenkins', 'REST APIs'] },
    { name: 'Aurex.ai', skills: ['Angular', 'TypeScript', 'D3.js', 'SCSS', 'Figma', 'REST APIs'] },
    { name: 'Learning & Events', skills: ['Angular', 'TypeScript', 'SCSS'] },
    { name: 'Underwater Ranges', skills: ['LabVIEW'] },
  ];
  // Top-to-bottom order of the skills column, arranged to keep the links tidy.
  const skillOrder = [
    'React', 'JavaScript', 'PostgreSQL', 'Spring Boot', 'Java', 'Postman', 'REST APIs', 'Oracle',
    'Jenkins', 'AngularJS', 'Angular', 'TypeScript', 'Figma', 'D3.js', 'SCSS', 'LabVIEW',
  ];

  const neighbours = new Map();
  const projectNodes = projects.map((p) => ({ id: `p:${p.name}`, name: p.name, type: 'project', degree: p.skills.length }));
  const usedSkills = new Set(projects.flatMap((p) => p.skills));
  const skillNames = skillOrder.filter((s) => usedSkills.has(s)).concat([...usedSkills].filter((s) => !skillOrder.includes(s)));
  const skillNodes = skillNames.map((s) => ({ id: `s:${s}`, name: s, type: 'skill', degree: 0 }));
  const nodes = projectNodes.concat(skillNodes);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  nodes.forEach((n) => neighbours.set(n.id, new Set()));
  const links = [];
  projects.forEach((p) => p.skills.forEach((s) => {
    const source = byId.get(`p:${p.name}`);
    const target = byId.get(`s:${s}`);
    target.degree += 1;
    links.push({ source, target });
    neighbours.get(source.id).add(target.id);
    neighbours.get(target.id).add(source.id);
  }));
  const dotRadius = (d) => (d.type === 'project' ? 6.5 : 2.6 + d.degree * 0.75);

  function describe(d) {
    const names = Array.from(neighbours.get(d.id), (id) => byId.get(id).name).join(', ');
    return d.type === 'project' ? `${d.name} — built with ${names}` : `${d.name} — used in ${names}`;
  }

  const svg = d3.select(host).append('svg')
    .attr('role', 'group')
    .attr('aria-label', 'Diagram connecting projects to the skills they used');
  const captionSel = svg.append('g').attr('aria-hidden', 'true').selectAll('text')
    .data(['PROJECTS', 'SKILLS']).join('text').attr('class', 'c-caption').text((d) => d);
  const linkSel = svg.append('g').selectAll('path').data(links).join('path').attr('class', 'c-link');
  const nodeSel = svg.append('g').selectAll('g').data(nodes).join('g')
    .attr('class', (d) => `c-node c-node--${d.type}`)
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', describe);
  nodeSel.append('rect').attr('class', 'c-node__hit');
  nodeSel.append('circle').attr('class', 'c-node__halo').attr('r', (d) => dotRadius(d) * 2.3);
  nodeSel.append('circle').attr('class', 'c-node__dot').attr('r', dotRadius);
  nodeSel.append('text').text((d) => d.name);

  /* ---------- Highlighting ---------- */
  let pinned = null;
  const highlight = (d) => {
    if (!d) {
      nodeSel.classed('is-dim', false).classed('is-active', false);
      linkSel.classed('is-dim', false).classed('is-active', false);
      info.textContent = defaultInfo;
      return;
    }
    const near = neighbours.get(d.id);
    nodeSel
      .classed('is-active', (n) => n.id === d.id || near.has(n.id))
      .classed('is-dim', (n) => n.id !== d.id && !near.has(n.id));
    linkSel
      .classed('is-active', (l) => l.source.id === d.id || l.target.id === d.id)
      .classed('is-dim', (l) => l.source.id !== d.id && l.target.id !== d.id);
    info.textContent = describe(d);
  };

  nodeSel
    .on('pointerenter', (event, d) => { if (event.pointerType !== 'touch') highlight(d); })
    .on('pointerleave', (event) => { if (event.pointerType !== 'touch') highlight(pinned); })
    .on('focus', (event, d) => highlight(d))
    .on('blur', () => highlight(pinned))
    .on('click', (event, d) => {
      event.stopPropagation();
      pinned = pinned === d ? null : d;
      highlight(pinned);
    })
    .on('keydown', (event, d) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      pinned = pinned === d ? null : d;
      highlight(pinned || d);
    });
  svg.on('click', () => { pinned = null; highlight(null); });

  /* ---------- Layout ---------- */
  let width = 0;
  let height = 0;
  const curve = d3.linkHorizontal().x((d) => d.x).y((d) => d.y);

  const layout = () => {
    width = host.clientWidth;
    height = host.clientHeight;
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const hostRect = host.getBoundingClientRect();
    const headRect = head.getBoundingClientRect();
    const left = headRect.left - hostRect.left;
    const right = headRect.right - hostRect.left;
    const beside = window.innerWidth >= 1000; // diagram sits beside the heading; otherwise below it
    const sideLabels = headRect.width >= 520; // labels beside the dots; otherwise tucked over the columns

    let projectX;
    let skillX;
    let top;
    if (beside) {
      const textRight = Math.max(title.getBoundingClientRect().right, info.getBoundingClientRect().right) - hostRect.left;
      projectX = textRight + 210;
      skillX = right - 96;
      top = 78;
    } else {
      projectX = sideLabels ? left + 150 : left + 8;
      skillX = sideLabels ? right - 110 : right - 8;
      top = info.getBoundingClientRect().bottom - hostRect.top + 70;
    }
    const bottom = height - 44;

    skillNodes.forEach((d, i) => {
      d.x = skillX;
      d.y = top + (i * (bottom - top)) / (skillNodes.length - 1);
    });
    const inset = (bottom - top) * 0.09;
    projectNodes.forEach((d, i) => {
      d.x = projectX;
      d.y = top + inset + (i * (bottom - top - inset * 2)) / (projectNodes.length - 1);
    });

    nodeSel.attr('transform', (d) => `translate(${d.x},${d.y})`);
    nodeSel.select('text')
      .attr('text-anchor', (d) => {
        if (sideLabels) return d.type === 'project' ? 'end' : 'start';
        return d.type === 'project' ? 'start' : 'end';
      })
      .attr('x', (d) => {
        if (sideLabels) return d.type === 'project' ? -18 : 14;
        return d.type === 'project' ? -5 : -12;
      })
      .attr('y', (d) => (!sideLabels && d.type === 'project' ? -15 : 4));
    // Generous hit area covering the dot and its label.
    nodeSel.select('.c-node__hit')
      .attr('x', (d) => {
        if (sideLabels) return d.type === 'project' ? -150 : -14;
        return d.type === 'project' ? -10 : -110;
      })
      .attr('y', (d) => (!sideLabels && d.type === 'project' ? -30 : -14))
      .attr('width', (d) => (sideLabels ? 164 : (d.type === 'project' ? 140 : 124)))
      .attr('height', (d) => (!sideLabels && d.type === 'project' ? 44 : 28));
    linkSel.attr('d', curve);
    captionSel
      .attr('x', (d, i) => (i === 0 ? projectX : skillX))
      .attr('y', top - 34)
      .attr('text-anchor', (d, i) => {
        if (sideLabels) return i === 0 ? 'end' : 'start';
        return i === 0 ? 'start' : 'end';
      })
      .attr('dx', (d, i) => {
        if (sideLabels) return i === 0 ? 8 : -6;
        return i === 0 ? -5 : 5;
      });
  };
  layout();

  /* ---------- Entrance: links draw themselves in, then the dots appear ---------- */
  const hide = () => {
    linkSel.each(function () {
      const length = this.getTotalLength();
      d3.select(this).attr('stroke-dasharray', length).attr('stroke-dashoffset', length);
    });
    nodeSel.style('opacity', 0);
    captionSel.style('opacity', 0);
  };
  const reveal = () => {
    layout(); // fonts may have loaded since the first measurement
    hide();
    captionSel.transition().duration(600).style('opacity', null);
    nodeSel.transition().delay((d, i) => i * 28).duration(500).style('opacity', null);
    linkSel.transition().delay((d, i) => 250 + i * 30).duration(900).ease(d3.easeCubicOut)
      .attr('stroke-dashoffset', 0)
      .on('end', function () { d3.select(this).attr('stroke-dasharray', null).attr('stroke-dashoffset', null); });
  };

  let started = reduceMotion;
  if (!reduceMotion) {
    hide();
    const start = () => { if (!started) { started = true; reveal(); } };
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) { start(); observer.disconnect(); }
      }, { threshold: 0.2 });
      observer.observe(host);
    } else {
      start();
    }
  }

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (host.clientWidth === width && host.clientHeight === height) return;
      layout();
      if (!started) hide();
    }, 200);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layout(); if (!started) hide(); });
})();
