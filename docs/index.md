# Admin Hub

Admin Hub is a lightweight, fully customisable, frontend-only website that's designed to serve as a dashboard for system administrators.

It lets sysadmins see the health of each site in their environment and quickly access other tools and portals.

Admin Hub only needs a few megabytes of space on a web server to run (e.g. on an Apache or IIS server).

## Getting started

* [Setup guide](https://stuartgarner.au/admin-hub/setup/)
* [User guide](https://stuartgarner.au/admin-hub/help/)
* [Live demo](https://stuartgarner.au/admin-hub/demo/)

## FAQs

### Why does Admin Hub exist?

On several occasions now I've needed to create a dashboard UI for other sysadmins I work with so that they can quickly see system health and status information about the IT networks they administer.

Having worked in predominantly Windows-based environments, we would normally use products like SCOM for monitoring system health and Splunk for SIEM. But I needed something a bit more lightweight that could act as a home page for sysadmins and our support teams that provides high-level health information at a glance.

When I first had the need to create a dashboard UI I started working on the front-end at home while learning about web development. I'd never touched HTML, CSS or JavaScript before. Over the years, I've continued to work on it privately while learning more and more about frontend development. Having continually reused the same frontend on several occasions I've decided to share it.

### If it's 'frontend-only', where does all the data about my environment come from?

That's up to you!

Admin Hub doesn't have any backend code - it's just HTML, CSS and JavaScript (and some images and config files) sitting on a web server.

When a user navigates to Admin Hub from a web browser, it'll look for some JSON files on the web server that hold information about your environment. The webpage will continually check these files for any changes or new data and update the webpage accordingly.

How you get the data in to those JSON files is entirely up to you.

For example: say you work in a predominantly Windows-based environment. You could create a PowerShell script to test the latency to each site on your network by doing a simple ping. Your script could then export the results of those latency tests to the *sites.json* file on the web server. Set that up as a scheduled task to run every 5 to 10 minutes and you're good to go.

Check out the [setup guide](https://stuartgarner.au/admin-hub/setup/) to see how to get started.

### Does Admin Hub work in an air gapped environment?

Yes! There are no external dependencies and no internet connectivity is required. All of the frontend can be hosted on your internal web server.

### What web browsers does Admin Hub support?

I built Admin Hub to work on Microsoft Edge and Google Chrome (i.e. Chromium-based browsers).

I try to support Firefox as best as I can however some features may not work perfectly (check the release notes).

Please don't use IE. You're probably working in an enterprise environment with bespoke, legacy software… trust me, I get it… but you should at least have a modern web browser installed.

### Do you ever plan to build a backend?

No, not at this stage.

### Can I modify Admin Hub? …or build my own backend for it?

Yes, go for it!

Admin Hub is issued under an MIT License and you are free to use, modify and redistribute as you see fit (provided you attribute :)).

P.S. don't forget to attribute [Flaticon](https://www.flaticon.com/uicons) as well if you intend to use the icons that come with Admin Hub.