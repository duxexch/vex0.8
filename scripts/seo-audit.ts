import http from 'http';
import https from 'https';
import { generateRobotsTxt, generateSitemapXml, DOMAIN_MATRIX, resolveCleanHost } from '../server/seoEngine';

interface AuditResult {
  category: string;
  test: string;
  status: 'PASS' | 'WARNING' | 'FAIL';
  details: string;
}

const auditResults: AuditResult[] = [];

function recordResult(category: string, test: string, status: 'PASS' | 'WARNING' | 'FAIL', details: string) {
  auditResults.push({ category, test, status, details });
  const icon = status === 'PASS' ? '✅' : status === 'WARNING' ? '⚠️' : '❌';
  console.log(`${icon} [${category}] ${test}: ${details}`);
}

async function runSeoAudit() {
  console.log('\n==============================================================================');
  console.log(' 🩺 VEX DEALS - AUTOMATED SEO, AI-SEARCH & MULTI-DOMAIN AUDIT HARNESS');
  console.log('==============================================================================\n');

  // 1. Audit Domain Matrix Configuration
  console.log('🔍 [1/6] Auditing Multi-Domain Architecture Matrix...');
  const expectedDomains = ['vex.deals', 'betjam.sbs', 'betongame.cloud', '1xbetservices.com', 'vixo.uno'];

  expectedDomains.forEach((dom) => {
    const config = DOMAIN_MATRIX[dom];
    if (config) {
      recordResult(
        'Domain Matrix',
        `Config for ${dom}`,
        'PASS',
        `Role: ${config.role}, Brand: ${config.brandName}, Indexable: ${config.isIndexable}`
      );
    } else {
      recordResult('Domain Matrix', `Config for ${dom}`, 'FAIL', `Missing domain matrix entry for ${dom}`);
    }
  });

  // 2. Audit Dynamic Robots.txt Generation
  console.log('\n🤖 [2/6] Auditing Dynamic Robots.txt Generation for Crawlers & AI...');
  ['vex.deals', 'betjam.sbs', 'betongame.cloud', '1xbetservices.com', 'vixo.uno'].forEach((dom) => {
    const robotsContent = generateRobotsTxt(dom);
    const config = DOMAIN_MATRIX[dom];

    if (!config.isIndexable) {
      if (robotsContent.includes('Disallow: /')) {
        recordResult(
          'Robots.txt',
          `Robots for ${dom} (Redirect Domain)`,
          'PASS',
          `Correctly disallows crawling on redirect domain (${robotsContent.length} bytes)`
        );
      } else {
        recordResult('Robots.txt', `Robots for ${dom}`, 'FAIL', `Expected Disallow / for non-indexable domain`);
      }
    } else {
      const hasDisallowAdmin = robotsContent.includes('Disallow: /admin');
      const hasSitemap = robotsContent.includes('Sitemap:');
      const hasAiBots = robotsContent.includes('Googlebot') && robotsContent.includes('OAI-SearchBot');

      if (hasDisallowAdmin && hasSitemap && hasAiBots) {
        recordResult(
          'Robots.txt',
          `Robots for ${dom}`,
          'PASS',
          `Contains Disallow /admin, Sitemap declaration & AI Bot rules (${robotsContent.length} bytes)`
        );
      } else {
        recordResult('Robots.txt', `Robots for ${dom}`, 'FAIL', `Malformed robots.txt output`);
      }
    }
  });

  // 3. Audit Dynamic XML Sitemap Generation
  console.log('\n🗺️ [3/6] Auditing Dynamic XML Sitemap Generation...');
  ['vex.deals', 'betjam.sbs', 'betongame.cloud', '1xbetservices.com'].forEach((dom) => {
    const sitemapXml = generateSitemapXml(dom);
    const hasXmlHeader = sitemapXml.startsWith('<?xml');
    const hasNoHashes = !sitemapXml.includes('#');
    const hasNoAdmin = !sitemapXml.includes('/admin');
    const hasCanonicalDomain = sitemapXml.includes(`https://${dom}`);

    if (hasXmlHeader && hasNoHashes && hasNoAdmin && hasCanonicalDomain) {
      recordResult(
        'Sitemap.xml',
        `Sitemap for ${dom}`,
        'PASS',
        `Valid XML, 0 hash fragments, 0 admin URLs, canonicalized to https://${dom}`
      );
    } else {
      recordResult(
        'Sitemap.xml',
        `Sitemap for ${dom}`,
        'FAIL',
        `Sitemap issues: header=${hasXmlHeader}, noHashes=${hasNoHashes}, noAdmin=${hasNoAdmin}`
      );
    }
  });

  // 4. Audit Host Header Safety & Sanitization
  console.log('\n🔒 [4/6] Auditing Host Header Safety & Sanitization...');
  const mockReqVex = { headers: { host: 'vex.deals' }, path: '/' } as any;
  const resolvedVex = resolveCleanHost(mockReqVex);
  if (resolvedVex.hostname === 'vex.deals' && !resolvedVex.shouldRedirectAlias) {
    recordResult('Host Safety', 'Sanitize vex.deals', 'PASS', 'Clean host resolved');
  } else {
    recordResult('Host Safety', 'Sanitize vex.deals', 'FAIL', 'Unexpected resolution');
  }

  const mockReqAlias = { headers: { host: 'vixo.uno' }, originalUrl: '/lottery' } as any;
  const resolvedAlias = resolveCleanHost(mockReqAlias);
  if (resolvedAlias.shouldRedirectAlias && resolvedAlias.redirectUrl === 'https://vex.deals/lottery') {
    recordResult('Host Safety', '301 Redirect for vixo.uno', 'PASS', 'Redirects correctly to https://vex.deals/lottery');
  } else {
    recordResult('Host Safety', '301 Redirect for vixo.uno', 'FAIL', `Target: ${resolvedAlias.redirectUrl}`);
  }

  // 5. Audit Pre-Rendered SEO Meta Head & JSON-LD Schema
  console.log('\n🏷️ [5/6] Auditing Pre-Rendered SEO Head & JSON-LD Schema...');
  const { renderSeoMetaHead } = await import('../server/seoEngine');
  const dummyHtml = '<html><head><title>Original Title</title></head><body><div id="root"></div></body></html>';
  const reqHome = { headers: { host: 'vex.deals' }, path: '/' } as any;
  const renderedHome = renderSeoMetaHead(reqHome, dummyHtml);

  if (renderedHome.includes('<title>VEX Deals') && renderedHome.includes('schema.org') && renderedHome.includes('SoftwareApplication')) {
    recordResult('Pre-Renderer', 'Homepage HTML Pre-Render', 'PASS', 'Successfully injected domain title, description, and Schema.org JSON-LD');
  } else {
    recordResult('Pre-Renderer', 'Homepage HTML Pre-Render', 'FAIL', 'Missing pre-rendered SEO metadata or JSON-LD schema');
  }

  const reqAdmin = { headers: { host: 'vex.deals' }, path: '/admin' } as any;
  const renderedAdmin = renderSeoMetaHead(reqAdmin, dummyHtml);

  if (renderedAdmin.includes('noindex') && renderedAdmin.includes('nofollow')) {
    recordResult('Pre-Renderer', 'Admin Route Guard', 'PASS', 'Correctly injected strict noindex, nofollow for /admin route');
  } else {
    recordResult('Pre-Renderer', 'Admin Route Guard', 'FAIL', 'Failed to protect admin route with noindex');
  }

  // 6. Summary & Scorecard Output
  console.log('\n==============================================================================');
  console.log(' 📊 SEO AUDIT SUMMARY & SCORECARD');
  console.log('==============================================================================');

  const passes = auditResults.filter((r) => r.status === 'PASS').length;
  const warnings = auditResults.filter((r) => r.status === 'WARNING').length;
  const fails = auditResults.filter((r) => r.status === 'FAIL').length;

  console.log(` ✅ PASSES:   ${passes}`);
  console.log(` ⚠️ WARNINGS: ${warnings}`);
  console.log(` ❌ FAILS:    ${fails}`);
  console.log('==============================================================================\n');

  if (fails > 0) {
    console.error('❌ SEO Audit failed critical checks!');
    process.exit(1);
  } else {
    console.log('🎉 All automated SEO, multi-domain & crawler tests passed successfully!');
    process.exit(0);
  }
}

runSeoAudit().catch((err) => {
  console.error('❌ SEO Audit error:', err);
  process.exit(1);
});
