type CooldownKey = `${string}_${string}`;

const timeouts: Map<CooldownKey, number> = new Map();

function check(userId: string, command: string): boolean {
	const key: CooldownKey = `${userId}_${command}`;
	const cooldownExpiration = timeouts.get(key);

	if (cooldownExpiration && cooldownExpiration > Date.now()) {
		return true;
	}

	return false;
}

function add(userId: string, command: string, cooldownDuration: number): void {
	const key: CooldownKey = `${userId}_${command}`;
	const cooldownExpiration = Date.now() + cooldownDuration;
	timeouts.set(key, cooldownExpiration);

	setTimeout(() => remove(userId, command), cooldownDuration);
}

function remove(userId: string, command: string): void {
	const key: CooldownKey = `${userId}_${command}`;
	timeouts.delete(key);
}

function remainingCooldown(userId: string, command: string): string {
	const key: CooldownKey = `${userId}_${command}`;
	const cooldownExpiration = timeouts.get(key);

	if (!cooldownExpiration) {
		return '0s';
	}

	const remainingTime = cooldownExpiration - Date.now();
	if (remainingTime <= 0) {
		return '0s';
	}

	const seconds = Math.floor(remainingTime / 1000) % 60;
	const minutes = Math.floor(remainingTime / (1000 * 60)) % 60;
	return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export { check, add, remove, remainingCooldown };
