/**
 * Tests for Bidirectional Folgezettel Plugin
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import BidirectionalFolgezettelPlugin from '../src/main';
import { App, TFile, Vault } from './__mocks__/obsidian';

describe('BidirectionalFolgezettelPlugin', () => {
    let plugin: BidirectionalFolgezettelPlugin;
    let mockApp: App;
    let mockVault: Vault;

    beforeEach(async () => {
        // Create mock app and vault
        mockApp = new App();
        mockVault = mockApp.vault;

        // Create plugin instance with type casting to bypass constructor requirements
        plugin = Object.create(BidirectionalFolgezettelPlugin.prototype);
        plugin.app = mockApp as any;
        plugin.settings = {
            autoProcess: true,
            showNotifications: true,
            autoBidirectionalLinks: true,
            parentLinkDescription: 'Parent',
            childLinkDescription: 'Child',
            backlinkHeading: 'Related Notes',
            forwardLinkHeading: 'Child Notes',
            crossLinkHeading: 'Related Notes'
        };
    });

    // ========================================================================
    // Address Parsing Tests
    // ========================================================================

    describe('parseAddress', () => {
        it('should parse simple numeric address', () => {
            const result = plugin.parseAddress('1');
            expect(result).not.toBeNull();
            expect(result?.segments).toEqual([1]);
        });

        it('should parse dot-separated numbers', () => {
            const result = plugin.parseAddress('1.2.3');
            expect(result?.segments).toEqual([1, 2, 3]);
        });

        it('should parse mixed number-letter sequences', () => {
            const result = plugin.parseAddress('1.2a');
            expect(result?.segments).toEqual([1, 2, 'a']);
        });

        it('should parse complex addresses', () => {
            const result = plugin.parseAddress('1.2a3c5');
            expect(result?.segments).toEqual([1, 2, 'a', 3, 'c', 5]);
        });

        it('should parse multi-letter sequences', () => {
            const result = plugin.parseAddress('1.13aa');
            expect(result?.segments).toEqual([1, 13, 'aa']);
        });

        it('should return null for empty string', () => {
            expect(plugin.parseAddress('')).toBeNull();
        });

        it('should return null for non-numeric start', () => {
            expect(plugin.parseAddress('a1')).toBeNull();
        });

        it('should handle whitespace', () => {
            const result = plugin.parseAddress('  1.2a  ');
            expect(result?.segments).toEqual([1, 2, 'a']);
        });

        it('should convert letters to lowercase', () => {
            const result = plugin.parseAddress('1.2A');
            expect(result?.segments).toEqual([1, 2, 'a']);
        });
    });

    // ========================================================================
    // Extract From Title Tests
    // ========================================================================

    describe('extractFromTitle', () => {
        it('should extract address at start of title', () => {
            expect(plugin.extractFromTitle('1.2a Some Topic')).toBe('1.2a');
        });

        it('should extract address with complex pattern', () => {
            expect(plugin.extractFromTitle('1.2a3c5 Deep Note')).toBe('1.2a3c5');
        });

        it('should extract simple number', () => {
            expect(plugin.extractFromTitle('1 Root Note')).toBe('1');
        });

        it('should return null for no address', () => {
            expect(plugin.extractFromTitle('Some Note Title')).toBeNull();
        });

        it('should extract address from anywhere in title', () => {
            expect(plugin.extractFromTitle('Note about 1.2a topic')).toBe('1.2a');
        });
    });

    // ========================================================================
    // Parent Address Tests
    // ========================================================================

    describe('getParentAddress', () => {
        it('should return parent of letter suffix', () => {
            expect(plugin.getParentAddress('1.2a')).toBe('1.2');
        });

        it('should return parent of number suffix', () => {
            expect(plugin.getParentAddress('1.2')).toBe('1');
        });

        it('should return parent of complex address', () => {
            expect(plugin.getParentAddress('1.2a3c')).toBe('1.2a3');
        });

        it('should return null for root address', () => {
            expect(plugin.getParentAddress('1')).toBeNull();
        });
    });

    // ========================================================================
    // Segments to Address Tests
    // ========================================================================

    describe('segmentsToAddress', () => {
        it('should convert simple number', () => {
            expect(plugin.segmentsToAddress([1])).toBe('1');
        });

        it('should convert dot-separated numbers', () => {
            expect(plugin.segmentsToAddress([1, 2, 3])).toBe('1.2.3');
        });

        it('should convert mixed segments', () => {
            expect(plugin.segmentsToAddress([1, 2, 'a'])).toBe('1.2a');
        });

        it('should convert complex segments', () => {
            expect(plugin.segmentsToAddress([1, 2, 'a', 3, 'c', 5])).toBe('1.2a3c5');
        });
    });

    // ========================================================================
    // Next Letter Sequence Tests
    // ========================================================================

    describe('nextLetterSequence', () => {
        it('should return "a" for empty string', () => {
            expect(plugin.nextLetterSequence('')).toBe('a');
        });

        it('should increment single letter', () => {
            expect(plugin.nextLetterSequence('a')).toBe('b');
            expect(plugin.nextLetterSequence('m')).toBe('n');
        });

        it('should handle z rollover', () => {
            expect(plugin.nextLetterSequence('z')).toBe('aa');
        });

        it('should handle multi-letter increment', () => {
            expect(plugin.nextLetterSequence('aa')).toBe('ab');
            expect(plugin.nextLetterSequence('az')).toBe('ba');
        });

        it('should handle multiple z rollover', () => {
            expect(plugin.nextLetterSequence('zz')).toBe('aaa');
        });
    });

    // ========================================================================
    // Extract Links Tests
    // ========================================================================

    describe('extractLinks', () => {
        it('should extract simple wiki links', () => {
            const content = 'Some text with [[Note A]] and [[Note B]]';
            const links = plugin.extractLinks(content);
            expect(links.has('Note A')).toBe(true);
            expect(links.has('Note B')).toBe(true);
            expect(links.size).toBe(2);
        });

        it('should handle aliased links', () => {
            const content = '[[Note A|Alias]] is here';
            const links = plugin.extractLinks(content);
            expect(links.has('Note A')).toBe(true);
        });

        it('should handle links with headers', () => {
            const content = '[[Note A#Section]] is here';
            const links = plugin.extractLinks(content);
            expect(links.has('Note A')).toBe(true);
        });

        it('should return empty set for no links', () => {
            const links = plugin.extractLinks('No links here');
            expect(links.size).toBe(0);
        });
    });

    // ========================================================================
    // Find Parent File Tests
    // ========================================================================

    describe('findParentFile', () => {
        it('should find parent file by address', () => {
            mockVault.addTestFile('1.2 Parent Note.md');
            mockVault.addTestFile('1.2a Child Note.md');

            const parent = plugin.findParentFile('1.2');
            expect(parent).not.toBeNull();
            expect(parent?.basename).toBe('1.2 Parent Note');
        });

        it('should return null when parent does not exist', () => {
            mockVault.addTestFile('1.2a Child Note.md');

            const parent = plugin.findParentFile('1.2');
            expect(parent).toBeNull();
        });
    });

    // ========================================================================
    // Find File By Basename Tests
    // ========================================================================

    describe('findFileByBasename', () => {
        it('should find file by basename', () => {
            mockVault.addTestFile('folder/Some Note.md');

            const file = plugin.findFileByBasename('Some Note');
            expect(file).not.toBeNull();
            expect(file?.basename).toBe('Some Note');
        });

        it('should be case-insensitive', () => {
            mockVault.addTestFile('Some Note.md');

            const file = plugin.findFileByBasename('some note');
            expect(file).not.toBeNull();
        });

        it('should return null when file does not exist', () => {
            const file = plugin.findFileByBasename('Nonexistent');
            expect(file).toBeNull();
        });
    });

    // ========================================================================
    // Suggest Next Child Tests
    // ========================================================================

    describe('suggestNextChild', () => {
        it('should suggest letter suffix when parent ends with number', () => {
            const next = plugin.suggestNextChild('1.2');
            expect(next).toBe('1.2a');
        });

        it('should suggest number suffix when parent ends with letter', () => {
            const next = plugin.suggestNextChild('1.2a');
            expect(next).toBe('1.2a1');
        });

        it('should suggest next letter when parent ends with number and children exist', () => {
            mockVault.addTestFile('1.2 Parent.md');
            mockVault.addTestFile('1.2a First Child.md');

            const next = plugin.suggestNextChild('1.2');
            expect(next).toBe('1.2b');
        });

        it('should suggest next number when parent ends with letter and children exist', () => {
            mockVault.addTestFile('1.2a Parent.md');
            mockVault.addTestFile('1.2a1 First Child.md');

            const next = plugin.suggestNextChild('1.2a');
            expect(next).toBe('1.2a2');
        });

        it('should find highest letter among children when parent ends with number', () => {
            mockVault.addTestFile('1.2 Parent.md');
            mockVault.addTestFile('1.2a Child A.md');
            mockVault.addTestFile('1.2c Child C.md');

            const next = plugin.suggestNextChild('1.2');
            expect(next).toBe('1.2d');
        });

        it('should find highest number among children when parent ends with letter', () => {
            mockVault.addTestFile('1.2a Parent.md');
            mockVault.addTestFile('1.2a1 Child 1.md');
            mockVault.addTestFile('1.2a5 Child 5.md');

            const next = plugin.suggestNextChild('1.2a');
            expect(next).toBe('1.2a6');
        });

        it('should handle deep nesting with alternation', () => {
            // Parent ends with number, so child should be letter
            expect(plugin.suggestNextChild('1.2a3')).toBe('1.2a3a');
            
            // Parent ends with letter, so child should be number
            expect(plugin.suggestNextChild('1.2a3b')).toBe('1.2a3b1');
        });
    });

    // ========================================================================
    // Get Last Segment Type Tests
    // ========================================================================

    describe('getLastSegmentType', () => {
        it('should return "number" for address ending with number', () => {
            expect(plugin.getLastSegmentType('1')).toBe('number');
            expect(plugin.getLastSegmentType('1.2')).toBe('number');
            expect(plugin.getLastSegmentType('1.2a3')).toBe('number');
        });

        it('should return "letter" for address ending with letter', () => {
            expect(plugin.getLastSegmentType('1a')).toBe('letter');
            expect(plugin.getLastSegmentType('1.2a')).toBe('letter');
            expect(plugin.getLastSegmentType('1.2a3b')).toBe('letter');
        });

        it('should return null for invalid address', () => {
            expect(plugin.getLastSegmentType('')).toBeNull();
            expect(plugin.getLastSegmentType('abc')).toBeNull();
        });
    });

    // ========================================================================
    // Get Children Of Tests
    // ========================================================================

    describe('getChildrenOf', () => {
        it('should return empty array for no children', () => {
            const children = plugin.getChildrenOf('1.2');
            expect(children).toEqual([]);
        });

        it('should return children of address', () => {
            mockVault.addTestFile('1.2 Parent.md');
            mockVault.addTestFile('1.2a Child A.md');
            mockVault.addTestFile('1.2b Child B.md');
            mockVault.addTestFile('1.3 Sibling.md');

            const children = plugin.getChildrenOf('1.2');
            expect(children).toContain('1.2a');
            expect(children).toContain('1.2b');
            expect(children).not.toContain('1.3');
        });
    });

    // ========================================================================
    // Insert Link Under Heading Tests
    // ========================================================================

    describe('insertLinkUnderHeading', () => {
        it('should insert link under existing heading', async () => {
            const file = mockVault.addTestFile('test.md', '# Title\n\n## Related Notes\n');
            const linkedFile = new TFile('linked.md');

            await plugin.insertLinkUnderHeading(file as any, linkedFile as any, 'Related Notes', 'Test');

            const content = mockVault.getFileContent('test.md');
            expect(content).toContain('[[linked]]');
            expect(content).toContain('(Test)');
        });

        it('should create heading if it does not exist', async () => {
            const file = mockVault.addTestFile('test.md', '# Title\n\nSome content');
            const linkedFile = new TFile('linked.md');

            await plugin.insertLinkUnderHeading(file as any, linkedFile as any, 'Related Notes', 'Test');

            const content = mockVault.getFileContent('test.md');
            expect(content).toContain('## Related Notes');
            expect(content).toContain('[[linked]]');
        });

        it('should not duplicate existing link', async () => {
            const file = mockVault.addTestFile('test.md', '## Related Notes\n- [[linked]]');
            const linkedFile = new TFile('linked.md');

            const inserted = await plugin.insertLinkUnderHeading(file as any, linkedFile as any, 'Related Notes', 'Test');

            expect(inserted).toBe(false);
        });
    });

    // ========================================================================
    // Settings Tests
    // ========================================================================

    describe('settings', () => {
        it('should have correct default settings', () => {
            expect(plugin.settings.autoProcess).toBe(true);
            expect(plugin.settings.showNotifications).toBe(true);
            expect(plugin.settings.autoBidirectionalLinks).toBe(true);
        });

        it('should have correct default headings', () => {
            expect(plugin.settings.backlinkHeading).toBe('Related Notes');
            expect(plugin.settings.forwardLinkHeading).toBe('Child Notes');
            expect(plugin.settings.crossLinkHeading).toBe('Related Notes');
        });

        it('should have correct default link descriptions', () => {
            expect(plugin.settings.parentLinkDescription).toBe('Parent');
            expect(plugin.settings.childLinkDescription).toBe('Child');
        });
    });
});
