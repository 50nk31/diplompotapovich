import cron from "node-cron";

import { setRulesChangedHandler } from "./runtime.js";
import { getRules, runMonitoring } from "./services.js";

type ScheduledRuleTask = {
  expression: string;
  task: ReturnType<typeof cron.schedule>;
};

const scheduledTasks = new Map<number, ScheduledRuleTask>();

function stopTask(ruleId: number) {
  const current = scheduledTasks.get(ruleId);
  if (!current) {
    return;
  }

  current.task.stop();
  scheduledTasks.delete(ruleId);
}

function scheduleRule(ruleId: number, expression: string) {
  const task = cron.schedule(expression, async () => {
    try {
      await runMonitoring({
        trigger: "schedule",
        ruleId,
        actor: "scheduler",
      });
    } catch (error) {
      console.error(`Scheduled monitoring failed for rule ${ruleId}`, error);
    }
  });

  scheduledTasks.set(ruleId, { expression, task });
}

export async function syncMonitoringSchedules() {
  const rules = await getRules();
  const activeRuleIds = new Set<number>();

  rules.forEach((rule) => {
    if (!rule.isActive) {
      stopTask(rule.id);
      return;
    }

    activeRuleIds.add(rule.id);

    if (!cron.validate(rule.scheduleCron)) {
      stopTask(rule.id);
      return;
    }

    const current = scheduledTasks.get(rule.id);
    if (current && current.expression === rule.scheduleCron) {
      return;
    }

    stopTask(rule.id);
    scheduleRule(rule.id, rule.scheduleCron);
  });

  Array.from(scheduledTasks.keys()).forEach((ruleId) => {
    if (!activeRuleIds.has(ruleId)) {
      stopTask(ruleId);
    }
  });
}

export async function startMonitoringScheduler() {
  setRulesChangedHandler(() => syncMonitoringSchedules());
  await syncMonitoringSchedules();
}
