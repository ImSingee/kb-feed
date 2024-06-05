import * as cheerio from 'cheerio';

const rssLink = 'https://singee.atlassian.net/wiki/spaces/createrssfeed.action?types=page&spaces=MAIN&maxResults=20&title=%5B%E7%9F%A5%E8%AF%86%E5%BA%93%5D%2B%E9%A1%B5%E9%9D%A2+%E6%BA%90&amp;publicFeed=false&amp;os_authType=basic'

async function getOriginalFeed() {
    console.log('Request:', rssLink);

    const response = await fetch(rssLink);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${rssLink}: ${response.statusText}`)
    }

    return await response.text();
}

async function transformFeed(originalFeed: string) {
    const $ = cheerio.load(originalFeed, { xml: true, xmlMode: true });

    $('feed > title').text('Bryan 的知识库');
    $('feed > subtitle').remove();

    $('entry').each((i, entry) => {
        const $entry = $(entry);

        const id = getId($('id', $entry).text())
        const title = $('title', $entry).text();
        console.log(`=== entry ${i + 1}: [${id}] ${title}`);

        const $summary = $('summary', $entry);

        const summaryType = $summary.attr('type');
        if (summaryType !== 'html') {
            throw new Error('invalid summary type: ' + `expect html, got ${summaryType}`)
        }

        const summaryContent = cheerio.load($summary.text()).root().text();

        const summaryWords = summaryContent.trim().split(/\s+/);
        console.log('summaryWordsCount: ', summaryWords.length)
        if (summaryWords.length <= 10) {
            console.log('Skip entry with no more than 10 words')
            console.log('summary: ', summaryWords.join(' '))

            $entry.remove()
        }
    })

    return $.xml();
}

function getId(entryId: string) {
    // tag:singee.atlassian.net,2009:page-3113041-2

    const parts = /.*:page-(\d+)-\d+/.exec(entryId)
    if (!parts) {
        throw new Error(`Cannot extract id from entryId ${entryId}`)
    }

    const id = parts[1]
    if (id !== parseInt(id).toString()) {
        throw new Error(`Cannot extract id from entryId ${entryId}`)
    }

    return id;
}

async function main() {
    const originalFeed = await getOriginalFeed()
    const newFeed = await transformFeed(originalFeed)
    await Bun.write('./dist/feed.xml', newFeed);
    console.log('Generated feed.xml')
}

main()