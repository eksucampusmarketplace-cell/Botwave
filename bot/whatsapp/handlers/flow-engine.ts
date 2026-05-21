/**
 * Chatbot flow engine for WhatsApp.
 * Processes multi-step conversational flows with branching, delays, and variable substitution.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface FlowNode {
  id: string;
  type: 'message' | 'question' | 'condition' | 'delay';
  content: string;
  next?: string;
  options?: { label: string; next: string }[];
}

interface Flow {
  id: string;
  name: string;
  trigger: string;
  nodes: FlowNode[];
  enabled: boolean;
}

interface FlowSession {
  user_jid: string;
  session_id: string;
  flow_id: string;
  step_index: number;
  answers: Record<string, string>;
}

export interface FlowResult {
  text: string;
  expectReply: boolean;
  delay?: number;
}

function substituteVariables(text: string, answers: Record<string, string>, userJid: string): string {
  let result = text;
  result = result.replace(/\{name\}/gi, userJid.split('@')[0]);
  result = result.replace(/\{phone\}/gi, userJid.split('@')[0]);
  result = result.replace(/\{date\}/gi, new Date().toLocaleDateString());
  result = result.replace(/\{time\}/gi, new Date().toLocaleTimeString());

  for (const [key, value] of Object.entries(answers)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'gi'), value);
  }

  // Replace {answerN} patterns
  const answerKeys = Object.keys(answers).sort();
  answerKeys.forEach((key, i) => {
    result = result.replace(new RegExp(`\\{answer${i + 1}\\}`, 'gi'), answers[key]);
  });

  return result;
}

export async function handleFlowTrigger(
  sessionId: string,
  messageText: string,
  userJid: string
): Promise<FlowResult | null> {
  const text = messageText.trim().toLowerCase();

  // Check if user has an active flow session
  const { data: activeSession } = await supabase
    .from('flow_sessions')
    .select('*')
    .eq('user_jid', userJid)
    .eq('session_id', sessionId)
    .single();

  if (activeSession) {
    return processFlowStep(activeSession as FlowSession, messageText);
  }

  // Check for flow triggers
  const { data: flows } = await supabase
    .from('chatbot_flows')
    .select('*')
    .eq('user_id', sessionId)
    .eq('enabled', true)
    .eq('platform', 'whatsapp');

  if (!flows || flows.length === 0) return null;

  for (const flow of flows as Flow[]) {
    if (text === flow.trigger.toLowerCase().trim()) {
      return startFlow(sessionId, flow, userJid);
    }
  }

  return null;
}

async function startFlow(sessionId: string, flow: Flow, userJid: string): Promise<FlowResult> {
  // Create flow session
  await supabase.from('flow_sessions').upsert({
    user_jid: userJid,
    session_id: sessionId,
    flow_id: flow.id,
    step_index: 0,
    answers: {},
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_jid,session_id' });

  return executeNode(flow.nodes[0], {}, userJid);
}

async function processFlowStep(session: FlowSession, userReply: string): Promise<FlowResult> {
  const { data: flow } = await supabase
    .from('chatbot_flows')
    .select('*')
    .eq('id', session.flow_id)
    .single();

  if (!flow || !flow.nodes) {
    await endFlowSession(session.user_jid, session.session_id);
    return { text: 'Flow ended.', expectReply: false };
  }

  const nodes = flow.nodes as FlowNode[];
  const currentNode = nodes[session.step_index];

  if (!currentNode) {
    await endFlowSession(session.user_jid, session.session_id);
    return { text: 'Flow completed. Thank you!', expectReply: false };
  }

  const answers = { ...session.answers };

  // Store answer if current node is a question
  if (currentNode.type === 'question') {
    answers[`step_${session.step_index}`] = userReply;
  }

  // Find next step
  let nextIndex = session.step_index + 1;

  if (currentNode.type === 'condition' && currentNode.options) {
    const matchedOption = currentNode.options.find(
      opt => opt.label.toLowerCase() === userReply.toLowerCase()
    );
    if (matchedOption && matchedOption.next) {
      const targetIdx = nodes.findIndex(n => n.id === matchedOption.next);
      if (targetIdx >= 0) nextIndex = targetIdx;
    }
  }

  // Update session
  if (nextIndex >= nodes.length) {
    await endFlowSession(session.user_jid, session.session_id);
    return { text: 'Flow completed. Thank you!', expectReply: false };
  }

  await supabase.from('flow_sessions').update({
    step_index: nextIndex,
    answers,
    updated_at: new Date().toISOString(),
  }).eq('user_jid', session.user_jid).eq('session_id', session.session_id);

  return executeNode(nodes[nextIndex], answers, session.user_jid);
}

function executeNode(node: FlowNode, answers: Record<string, string>, userJid: string): FlowResult {
  const text = substituteVariables(node.content, answers, userJid);

  switch (node.type) {
    case 'message':
      return { text, expectReply: false };
    case 'question':
      return { text, expectReply: true };
    case 'condition':
      const options = node.options?.map(o => o.label).join(', ') || '';
      return { text: `${text}\n\nOptions: ${options}`, expectReply: true };
    case 'delay':
      const delaySec = parseInt(node.content) || 5;
      return { text: '', expectReply: false, delay: delaySec * 1000 };
    default:
      return { text, expectReply: false };
  }
}

async function endFlowSession(userJid: string, sessionId: string): Promise<void> {
  await supabase
    .from('flow_sessions')
    .delete()
    .eq('user_jid', userJid)
    .eq('session_id', sessionId);
}
