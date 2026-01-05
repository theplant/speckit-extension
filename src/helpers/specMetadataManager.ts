import * as fs from 'fs';
import * as path from 'path';

export interface SpecMetadata {
  testDirectory?: string;
}

export class SpecMetadataManager {
  /**
   * Read metadata from spec.md YAML frontmatter
   */
  readMetadata(specFilePath: string): SpecMetadata {
    if (!fs.existsSync(specFilePath)) {
      return {};
    }

    const content = fs.readFileSync(specFilePath, 'utf-8');
    return this.parseYamlFrontmatter(content);
  }

  /**
   * Write/update metadata in spec.md YAML frontmatter
   */
  writeMetadata(specFilePath: string, metadata: SpecMetadata): void {
    if (!fs.existsSync(specFilePath)) {
      throw new Error(`Spec file not found: ${specFilePath}`);
    }

    const content = fs.readFileSync(specFilePath, 'utf-8');
    const updatedContent = this.updateYamlFrontmatter(content, metadata);
    fs.writeFileSync(specFilePath, updatedContent, 'utf-8');
  }

  /**
   * Get test directory for a spec, returns undefined if not configured
   */
  getTestDirectory(specFilePath: string): string | undefined {
    const metadata = this.readMetadata(specFilePath);
    return metadata.testDirectory;
  }

  /**
   * Set test directory for a spec
   */
  setTestDirectory(specFilePath: string, testDirectory: string): void {
    const metadata = this.readMetadata(specFilePath);
    metadata.testDirectory = testDirectory;
    this.writeMetadata(specFilePath, metadata);
  }

  /**
   * Parse YAML frontmatter from markdown content
   */
  private parseYamlFrontmatter(content: string): SpecMetadata {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return {};
    }

    const yaml = frontmatterMatch[1];
    const metadata: SpecMetadata = {};

    // Simple YAML parsing for key: value pairs
    const lines = yaml.split('\n');
    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const key = match[1];
        const value = match[2].trim();
        if (key === 'testDirectory') {
          metadata.testDirectory = value;
        }
      }
    }

    return metadata;
  }

  /**
   * Update or add YAML frontmatter in markdown content
   */
  private updateYamlFrontmatter(content: string, metadata: SpecMetadata): string {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    
    // Build new frontmatter content
    const yamlLines: string[] = [];
    if (metadata.testDirectory) {
      yamlLines.push(`testDirectory: ${metadata.testDirectory}`);
    }

    if (yamlLines.length === 0) {
      // No metadata to write, return content as-is or remove empty frontmatter
      if (frontmatterMatch) {
        return content.replace(/^---\n[\s\S]*?\n---\n?/, '');
      }
      return content;
    }

    const newFrontmatter = `---\n${yamlLines.join('\n')}\n---`;

    if (frontmatterMatch) {
      // Replace existing frontmatter
      return content.replace(/^---\n[\s\S]*?\n---/, newFrontmatter);
    } else {
      // Add new frontmatter at the beginning
      return `${newFrontmatter}\n${content}`;
    }
  }
}
