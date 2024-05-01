const timeouts = new Map();

function check(userId, command) {
  const key = `${userId}_${command}`;
  const cooldownExpiration = timeouts.get(key);

  if (cooldownExpiration && cooldownExpiration > Date.now()) {
    return true;
  }

  return false;
}

function add(userId, command, cooldownDuration) {
  const key = `${userId}_${command}`;
  const cooldownExpiration = Date.now() + cooldownDuration;
  timeouts.set(key, cooldownExpiration);

  setTimeout(() => remove(userId, command), cooldownDuration);
}

function remove(userId, command) {
  const key = `${userId}_${command}`;
  timeouts.delete(key);
}

function remainingCooldown(userId, command) {
  const key = `${userId}_${command}`;
  const cooldownExpiration = timeouts.get(key);

  if (!cooldownExpiration) {
    return 0;
  }

  const remainingTime = cooldownExpiration - Date.now();
  const seconds = Math.floor(remainingTime / 1000) % 60;
  const minutes = Math.floor(remainingTime / (1000 * 60)) % 60;
  const formattedTime = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  return remainingTime > 0 ? formattedTime : "0s";
}

module.exports = {
  check,
  add,
  remove,
  remainingCooldown,
};
