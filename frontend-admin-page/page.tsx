"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Activity, ArrowDownToLine, Check, ClipboardList, RefreshCw, Search, Users, WalletCards, X } from "lucide-react";
import { api, post } from "@/lib/api";
import { AdminOnly } from "@/components/require-auth";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Tab = "users" | "withdrawals" | "audit";
type UserRow = { id: string; email: string; role: string; createdAt: string };
type WithdrawalRow = { id: string; amount: string; createdAt: string; user: { email: string } };
const tabs: { key: Tab; label: string; icon: typeof Users }[] = [{ key: "users", label: "Users", icon: Users }, { key: "withdrawals", label: "Withdrawals", icon: WalletCards }, { key: "audit", label: "Audit log", icon: ClipboardList }];

export default function Admin() {
  const [tab, setTab] = useState<Tab>("withdrawals");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setError("");
    try {
      const [userRows, withdrawalRows, auditRows] = await Promise.all([
        api<UserRow[]>(`/admin/users?q=${encodeURIComponent(search)}`), api<WithdrawalRow[]>("/admin/withdrawals"), api<any[]>("/admin/audit-logs"),
      ]);
      setUsers(userRows); setWithdrawals(withdrawalRows); setAudit(auditRows);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load operations data."); }
    finally { setLoading(false); }
  }, [search]);
  useEffect(() => { void load(); }, [load]);
  async function submitSearch(event: FormEvent) { event.preventDefault(); setSearch(query.trim()); }
  async function review(id: string, approve: boolean) {
    setBusy(id); setError("");
    try { await post(`/admin/withdrawals/${id}/${approve ? "approve" : "reject"}`, { idempotency_key: crypto.randomUUID() }); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The withdrawal review failed."); }
    finally { setBusy(""); }
  }
  const tabCounts: Record<Tab, number> = { users: users.length, withdrawals: withdrawals.length, audit: audit.length };

  return <AdminOnly><div className="admin-heading"><div><p className="dashboard-kicker">FIRSTPAY PLAY / OPERATIONS</p><h1>Admin workspace</h1><p className="dashboard-subtitle">Review account activity and pending wallet requests.</p></div><Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw size={14} className={loading ? "animate-spin" : ""}/> Refresh data</Button></div>
    <div className="admin-metrics"><Card><span><Users size={15}/> PLAYER ACCOUNTS</span><strong>{loading ? "—" : users.length}</strong><small>Most recent 50 accounts</small></Card><Card className={withdrawals.length ? "metric-attention" : ""}><span><ArrowDownToLine size={15}/> WITHDRAWAL QUEUE</span><strong>{loading ? "—" : withdrawals.length}</strong><small>Awaiting admin decision</small></Card><Card><span><Activity size={15}/> AUDIT EVENTS</span><strong>{loading ? "—" : audit.length}</strong><small>Latest recorded actions</small></Card></div>
    {error && <div role="alert" className="notice-error">{error}<Button size="sm" variant="outline" onClick={() => void load()}>Retry</Button></div>}
    <div className="admin-tabs" role="tablist" aria-label="Admin sections">{tabs.map(({ key, label, icon: Icon }) => <button role="tab" aria-selected={tab === key} key={key} className={tab === key ? "admin-tab selected" : "admin-tab"} onClick={() => setTab(key)}><Icon size={15}/>{label}<span>{tabCounts[key]}</span></button>)}</div>
    <Card className="admin-content">
      {tab === "users" && <><div className="admin-content-head"><div><CardTitle>Player accounts</CardTitle><p>Search by email address. Administrative permissions remain server checked.</p></div><form className="admin-search" onSubmit={event => void submitSearch(event)}><input aria-label="Search accounts by email" className="field" placeholder="Search by email" value={query} onChange={event => setQuery(event.target.value)}/><Button aria-label="Search users" size="icon" variant="outline"><Search size={15}/></Button></form></div>{loading ? <TableLoading/> : users.length === 0 ? <Empty message="No accounts match this search."/> : <div className="table-wrap"><table><thead><tr><th>Player</th><th>Access</th><th>Joined</th></tr></thead><tbody>{users.map(user => <tr key={user.id}><td className="admin-email">{user.email}</td><td><span className={`role-pill ${user.role === "ADMIN" ? "admin-role" : ""}`}>{user.role}</span></td><td>{new Date(user.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div>}</>}
      {tab === "withdrawals" && <><div className="admin-content-head"><div><CardTitle>Withdrawal approvals</CardTitle><p>Approval debits the player wallet and creates an audit entry.</p></div><span className="admin-readonly">{withdrawals.length} PENDING</span></div>{loading ? <TableLoading/> : withdrawals.length === 0 ? <Empty message="The approval queue is clear."/> : <div className="table-wrap"><table><thead><tr><th>Player</th><th>Amount</th><th>Requested</th><th>Decision</th></tr></thead><tbody>{withdrawals.map(item => <tr key={item.id}><td className="admin-email">{item.user.email}</td><td className="withdrawal-amount">{item.amount} EUR</td><td>{new Date(item.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td><td><div className="admin-decision"><Button size="sm" disabled={Boolean(busy)} onClick={() => void review(item.id, true)}><Check size={13}/>{busy === item.id ? "Saving" : "Approve"}</Button><Button size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => void review(item.id, false)}><X size={13}/>Reject</Button></div></td></tr>)}</tbody></table></div>}</>}
      {tab === "audit" && <><div className="admin-content-head"><div><CardTitle>Audit trail</CardTitle><p>Administrative and wallet decisions recorded by the API.</p></div></div>{loading ? <TableLoading/> : audit.length === 0 ? <Empty message="No audit events have been recorded."/> : <div className="table-wrap"><table><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th></tr></thead><tbody>{audit.map(item => <tr key={item.id}><td>{new Date(item.createdAt).toLocaleString()}</td><td>{item.actor?.email ?? "System"}</td><td><span className="audit-action">{item.action}</span></td><td>{item.targetType} · {item.targetId}</td></tr>)}</tbody></table></div>}</>}
    </Card>
  </AdminOnly>;
}
function Empty({ message }: { message: string }) { return <div className="admin-empty"><span><ClipboardList size={18}/></span><p>{message}</p></div>; }
function TableLoading() { return <div className="activity-loading"><span className="loading-bar"/><span className="loading-bar"/><span className="loading-bar"/></div>; }
