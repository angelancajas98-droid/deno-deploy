import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFileSync, realpathSync } from "node:fs";
import { EOL } from "node:os";
import { isAbsolute, relative, resolve } from "node:path";

function getLatestTag() {
	try {
		return execSync("git describe --abbrev=0 --tags").toString().trim();
	} catch (e) {
		console.warn(e);
		return execSync("git rev-list --max-parents=0 HEAD").toString().trim();
	}
}

const commits = execSync(
	`git log ${getLatestTag()}..HEAD  --pretty="format:%s%b"`,
)
	.toString()
	.trim()
	.split("\n")
	.reverse();

console.log(getLatestTag(), commits);

const version = execSync("npm pkg get version").toString().replace(/"/gi, "");

const delimiter = `---${randomUUID()}---${EOL}`;

const githubOutput = process.env.GITHUB_OUTPUT;
if (githubOutput) {
	const resolvedOutput = resolve(githubOutput);
	const safeRoot = resolve(process.env.RUNNER_TEMP ?? process.cwd());

	const canonicalSafeRoot = (() => {
		try {
			return realpathSync.native(safeRoot);
		} catch {
			return safeRoot;
		}
	})();
	const canonicalOutput = (() => {
		try {
			return realpathSync.native(resolvedOutput);
		} catch {
			return resolvedOutput;
		}
	})();

	const rel = relative(canonicalSafeRoot, canonicalOutput);
	if (rel === "" ? false : rel.startsWith("..") || isAbsolute(rel))
		throw new Error("Unsafe GITHUB_OUTPUT path");

	appendFileSync(
		resolvedOutput,
		`changelog<<${delimiter}${commits.join(
			EOL.repeat(2),
		)}${EOL}${delimiter}version=${version}${EOL}`,
	);
} else console.log("Not github actions");
