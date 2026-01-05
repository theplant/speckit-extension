import * as fs from 'fs';
import * as path from 'path';
import { FeatureSpec, UserStory, AcceptanceScenario } from '../types';

export class SpecParser {
  private readonly userStoryPattern = /^### User Story (\d+) - (.+?) \(Priority: (P\d)\)/;
  // Pattern for format: 1. **Given** X, **When** Y, **Then** Z
  private readonly scenarioPattern = /^(\d+)\. \*\*Given\*\* (.+?), \*\*When\*\* (.+?), \*\*Then\*\* (.+)/;
  // Pattern for format: 1. **US1-AS1**: **Given** X, **When** Y, **Then** Z
  // Also handles sub-scenarios like: 1a. **US1-AS1a**: **Given** X, **When** Y, **Then** Z
  private readonly scenarioWithIdPattern = /^(\d+[a-z]?)\. \*\*(US\d+-AS\d+[a-z]?)\*\*: \*\*Given\*\* (.+?), \*\*When\*\* (.+?), \*\*Then\*\* (.+)/;
  private readonly whyPriorityPattern = /^\*\*Why this priority\*\*: (.+)/;
  private readonly independentTestPattern = /^\*\*Independent Test\*\*: (.+)/;

  async parseSpecFile(filePath: string): Promise<FeatureSpec | null> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const dirPath = path.dirname(filePath);
      const dirName = path.basename(dirPath);

      const featureSpec: FeatureSpec = {
        path: dirPath,
        name: dirName,
        displayName: this.formatDisplayName(dirName),
        number: this.extractNumber(dirName),
        specFilePath: filePath,
        planFilePath: this.findPlanFile(dirPath),
        userStories: [],
        lastModified: fs.statSync(filePath).mtimeMs
      };

      let currentStory: UserStory | null = null;
      let currentStoryEndLine = 0;
      let inAcceptanceScenarios = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        const storyMatch = line.match(this.userStoryPattern);
        if (storyMatch) {
          if (currentStory) {
            currentStory.endLine = currentStoryEndLine;
            featureSpec.userStories.push(currentStory);
          }
          currentStory = {
            number: parseInt(storyMatch[1]),
            title: storyMatch[2],
            priority: storyMatch[3] as 'P1' | 'P2' | 'P3',
            startLine: lineNum,
            endLine: lineNum,
            description: '',
            acceptanceScenarios: [],
            featureSpec: featureSpec
          };
          inAcceptanceScenarios = false;
          continue;
        }

        if (currentStory) {
          currentStoryEndLine = lineNum;

          const whyMatch = line.match(this.whyPriorityPattern);
          if (whyMatch) {
            currentStory.whyPriority = whyMatch[1];
            continue;
          }

          const testMatch = line.match(this.independentTestPattern);
          if (testMatch) {
            currentStory.independentTest = testMatch[1];
            continue;
          }

          // Match both "**Acceptance Scenarios**:" and "**Acceptance Scenarios - Section Name**:"
          if (line.includes('**Acceptance Scenarios')) {
            inAcceptanceScenarios = true;
            continue;
          }

          if (line.startsWith('---')) {
            inAcceptanceScenarios = false;
            continue;
          }

          if (inAcceptanceScenarios) {
            // Try new format with explicit ID first (e.g., 1. **US1-AS1**: **Given** ...)
            const scenarioWithIdMatch = line.match(this.scenarioWithIdPattern);
            if (scenarioWithIdMatch) {
              const scenario: AcceptanceScenario = {
                number: this.parseScenarioNumber(scenarioWithIdMatch[1]),
                id: scenarioWithIdMatch[2],
                given: scenarioWithIdMatch[3],
                when: scenarioWithIdMatch[4],
                then: scenarioWithIdMatch[5],
                line: lineNum,
                linkedTests: [],
                userStory: currentStory
              };
              currentStory.acceptanceScenarios.push(scenario);
            } else {
              // Fall back to old format (e.g., 1. **Given** ...)
              const scenarioMatch = line.match(this.scenarioPattern);
              if (scenarioMatch) {
                const scenario: AcceptanceScenario = {
                  number: parseInt(scenarioMatch[1]),
                  id: `US${currentStory.number}-AS${scenarioMatch[1]}`,
                  given: scenarioMatch[2],
                  when: scenarioMatch[3],
                  then: scenarioMatch[4],
                  line: lineNum,
                  linkedTests: [],
                  userStory: currentStory
                };
                currentStory.acceptanceScenarios.push(scenario);
              }
            }
          } else if (!currentStory.description && line.trim() && !line.startsWith('**')) {
            currentStory.description = line.trim();
          }
        }
      }

      if (currentStory) {
        currentStory.endLine = currentStoryEndLine;
        featureSpec.userStories.push(currentStory);
      }

      return featureSpec;
    } catch (error) {
      console.error(`Failed to parse spec file: ${filePath}`, error);
      return null;
    }
  }

  async parseAllSpecs(workspaceRoot: string, specsDir: string = 'specs'): Promise<FeatureSpec[]> {
    const specs: FeatureSpec[] = [];
    const specsPath = path.join(workspaceRoot, specsDir);

    if (!fs.existsSync(specsPath)) {
      return specs;
    }

    const entries = fs.readdirSync(specsPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const specFilePath = path.join(specsPath, entry.name, 'spec.md');
        if (fs.existsSync(specFilePath)) {
          const spec = await this.parseSpecFile(specFilePath);
          if (spec) {
            specs.push(spec);
          }
        }
      }
    }

    specs.sort((a, b) => a.number - b.number);
    return specs;
  }

  findUserStoryLine(filePath: string, storyNumber: number): number | undefined {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(this.userStoryPattern);
        if (match && parseInt(match[1]) === storyNumber) {
          return i + 1;
        }
      }
    } catch {
      return undefined;
    }
    return undefined;
  }

  findScenarioLine(filePath: string, storyNumber: number, scenarioNumber: number): number | undefined {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      let inTargetStory = false;

      for (let i = 0; i < lines.length; i++) {
        const storyMatch = lines[i].match(this.userStoryPattern);
        if (storyMatch) {
          inTargetStory = parseInt(storyMatch[1]) === storyNumber;
          continue;
        }

        if (inTargetStory) {
          const scenarioMatch = lines[i].match(this.scenarioPattern);
          if (scenarioMatch && parseInt(scenarioMatch[1]) === scenarioNumber) {
            return i + 1;
          }
        }
      }
    } catch {
      return undefined;
    }
    return undefined;
  }

  private formatDisplayName(dirName: string): string {
    return dirName
      .replace(/^\d+-/, '')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private extractNumber(dirName: string): number {
    const match = dirName.match(/^(\d+)-/);
    return match ? parseInt(match[1]) : 0;
  }

  private findPlanFile(dirPath: string): string | undefined {
    const planPath = path.join(dirPath, 'plan.md');
    return fs.existsSync(planPath) ? planPath : undefined;
  }

  private parseScenarioNumber(numStr: string): number {
    // Parse scenario numbers like "1", "1a", "2b" - extract the numeric part
    const match = numStr.match(/^(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }
}
