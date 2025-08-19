import fs from 'fs';
import path from 'path';

const distDir = './dist';
const sitemapIndexPath = path.join(distDir, 'sitemap-index.xml');
const sitemap0Path = path.join(distDir, 'sitemap-0.xml');
const sitemapPath = path.join(distDir, 'sitemap.xml');

try {
  // Check if sitemap-0.xml exists
  if (fs.existsSync(sitemap0Path)) {
    // Read the content of sitemap-0.xml
    let sitemapContent = fs.readFileSync(sitemap0Path, 'utf8');
    
    // Add priority and changefreq to URLs based on path
    sitemapContent = sitemapContent.replace(/<url>\s*<loc>(.*?)<\/loc>/g, (match, url) => {
      let priority = '0.5';
      let changefreq = 'weekly';
      
      // Set priority and changefreq based on URL patterns
      if (url.endsWith('cologne.ravers.workers.dev/')) {
        // Homepage gets highest priority
        priority = '1.0';
        changefreq = 'daily';
      } else if (url.includes('/parties')) {
        // Parties page gets high priority
        priority = '0.9';
        changefreq = 'daily';
      } else if (url.includes('/form')) {
        // Form page gets medium priority
        priority = '0.7';
        changefreq = 'monthly';
      } else if (url.includes('/extract')) {
        // Extract page gets lower priority
        priority = '0.3';
        changefreq = 'monthly';
      }
      
      return `<url>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>`;
    });
    
    // Format the XML nicely
    const formattedContent = sitemapContent
      .replace(/><url>/g, '>\n  <url>')
      .replace(/<\/url><url>/g, '</url>\n  <url>')
      .replace(/<\/url><\/urlset>/g, '</url>\n</urlset>')
      .replace(/xmlns:news="[^"]*"/g, '\n    xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"')
      .replace(/xmlns:xhtml="[^"]*"/g, '\n    xmlns:xhtml="http://www.w3.org/1999/xhtml"')
      .replace(/xmlns:image="[^"]*"/g, '\n    xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"')
      .replace(/xmlns:video="[^"]*"/g, '\n    xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"');
    
    // Write to sitemap.xml
    fs.writeFileSync(sitemapPath, formattedContent);
    
    // Remove sitemap-index.xml and sitemap-0.xml
    if (fs.existsSync(sitemapIndexPath)) {
      fs.unlinkSync(sitemapIndexPath);
    }
    fs.unlinkSync(sitemap0Path);
    
    console.log('✅ Single sitemap.xml created successfully with SEO optimizations');
    console.log('   - Added priority values based on page importance');
    console.log('   - Added changefreq values for crawl frequency hints');
    console.log('   - Added lastmod dates');
  } else {
    console.log('⚠️  sitemap-0.xml not found, skipping sitemap consolidation');
  }
} catch (error) {
  console.error('❌ Error processing sitemap:', error.message);
}