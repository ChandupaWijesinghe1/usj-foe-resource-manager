"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Package,
  Search,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { Equipment } from "@/types";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function EquipmentPage() {
  const { user } = useAuth();
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Borrow Modal State
  const [selectedItem, setSelectedItem] = useState<Equipment | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [purpose, setPurpose] = useState("");
  const [borrowDate, setBorrowDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchEquipment();
  }, [search]);

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const url = search ? `/equipment?search=${encodeURIComponent(search)}` : "/equipment";
      const res = await api.get(url);
      setEquipmentList(res.data);
    } catch {
      // Mock items for local presentation
      setEquipmentList([
        {
          id: "eq-1",
          lab_id: "lab-1",
          name: "Rigol DS1054Z Digital Storage Oscilloscope (50MHz, 4-Channel)",
          model_number: "DS1054Z",
          serial_number: "RIGOL-OSC-042",
          category: "Electronic Test & Measurement",
          total_quantity: 10,
          available_quantity: 8,
          is_borrowable: true,
          requires_admin_approval: true,
          condition_status: "EXCELLENT",
        },
        {
          id: "eq-2",
          lab_id: "lab-1",
          name: "Fluke 87V True-RMS Industrial Digital Multimeter",
          model_number: "87-V",
          serial_number: "FLUKE-87-019",
          category: "Handheld Instruments",
          total_quantity: 15,
          available_quantity: 12,
          is_borrowable: true,
          requires_admin_approval: true,
          condition_status: "GOOD",
        },
        {
          id: "eq-3",
          lab_id: "lab-1",
          name: "Sokkia Total Station Electronic Theodolite",
          model_number: "CX-105",
          serial_number: "SOKKIA-TS-003",
          category: "Civil Surveying Equipment",
          total_quantity: 3,
          available_quantity: 2,
          is_borrowable: true,
          requires_admin_approval: true,
          condition_status: "EXCELLENT",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleBorrowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setSubmitting(true);
    setStatusMsg(null);

    const bDate = new Date(borrowDate);
    const rDate = new Date(returnDate);
    if (isNaN(bDate.getTime()) || isNaN(rDate.getTime())) {
      setStatusMsg({ type: "error", text: "Please select valid borrow and return dates." });
      setSubmitting(false);
      return;
    }

    if (rDate <= bDate) {
      setStatusMsg({ type: "error", text: "Return date must be strictly after the borrow date." });
      setSubmitting(false);
      return;
    }

    try {
      await api.post("/equipment/borrows", {
        equipment_id: selectedItem.id,
        quantity: Number(quantity),
        purpose: purpose.trim(),
        expected_borrow_date: bDate.toISOString(),
        expected_return_date: rDate.toISOString(),
      });
      setStatusMsg({
        type: "success",
        text: `Borrow petition submitted for ${selectedItem.name}! Awaiting lab technician check-out. You can track this in My Petitions.`,
      });
      setTimeout(() => {
        setSelectedItem(null);
        fetchEquipment();
      }, 2000);
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: err.response?.data?.error?.message || err.response?.data?.detail || "Borrow request failed.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
      <div className="flex sm:justify-end">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search instruments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading lab equipment...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {equipmentList.map((item) => (
            <Card key={item.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{item.name}</CardTitle>
                    <CardDescription className="text-xs font-mono mt-0.5">
                      {item.model_number || "Standard Unit"} • {item.category}
                    </CardDescription>
                  </div>
                  <Badge variant={item.available_quantity > 0 ? "success" : "destructive"}>
                    {item.available_quantity > 0 ? `${item.available_quantity} Available` : "Out of Stock"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between border-t pt-2">
                  <span>Total Inventory:</span>
                  <span className="font-semibold text-foreground">{item.total_quantity} units</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Condition:</span>
                  <Badge variant="outline" className="text-[10px]">
                    {item.condition_status}
                  </Badge>
                </div>
                {item.serial_number && (
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span>Serial:</span>
                    <span>{item.serial_number}</span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-2 border-t">
                <Button
                  variant="usj"
                  size="sm"
                  className="w-full gap-1.5"
                  disabled={item.available_quantity <= 0 || !item.is_borrowable}
                  onClick={() => {
                    setSelectedItem(item);
                    setStatusMsg(null);
                  }}
                >
                  <Wrench className="h-4 w-4" /> Request Borrowing
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Borrow Request Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg shadow-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Borrow {selectedItem.name}</CardTitle>
                  <CardDescription className="text-xs">
                    Stock available: {selectedItem.available_quantity} • Condition: {selectedItem.condition_status}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedItem(null)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {statusMsg && (
                <div
                  className={`mb-4 flex items-start gap-2 rounded-md p-3 text-xs font-medium ${
                    statusMsg.type === "success"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {statusMsg.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{statusMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleBorrowSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Quantity Needed</label>
                  <Input
                    type="number"
                    min="1"
                    max={selectedItem.available_quantity}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Expected Checkout Date</label>
                    <Input
                      type="datetime-local"
                      value={borrowDate}
                      onChange={(e) => setBorrowDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Expected Return Date</label>
                    <Input
                      type="datetime-local"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Project Purpose & Lab Module</label>
                  <Textarea
                    placeholder="e.g. EC4010 Embedded Systems laboratory experiment or FYP robotic vehicle testing..."
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    required
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedItem(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="usj" size="sm" disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit Borrow Request"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
