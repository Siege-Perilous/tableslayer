import type { PageServerLoad } from './$types';

interface ChangelogEntry {
  filename: string;
  content: string;
  month: string;
  year: string;
  displayDate: string;
  anchorId: string;
}

// Import all markdown files at build time - this enables HMR
const changelogModules = import.meta.glob('$lib/changelog/*.md', {
  eager: true,
  query: '?raw',
  import: 'default'
});

export const load: PageServerLoad = async () => {
  try {
    const entries: ChangelogEntry[] = Object.entries(changelogModules)
      .map(([path, content]) => {
        const filename = path.split('/').pop() || '';
        const [year, month] = filename.replace('.md', '').split('-');

        const monthNames = [
          'January',
          'February',
          'March',
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December'
        ];

        const monthName = monthNames[parseInt(month) - 1] || month;
        const displayDate = `${monthName} ${year}`;
        const anchorId = filename.replace('.md', '');

        return {
          filename,
          content: content as string,
          month: monthName,
          year,
          displayDate,
          anchorId
        };
      })
      .sort((a, b) => b.filename.localeCompare(a.filename));

    return {
      entries
    };
  } catch (error) {
    console.error('Error loading changelog entries:', error);
    return {
      entries: []
    };
  }
};
