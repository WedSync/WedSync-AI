'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeftIcon,
  UserIcon,
  CalendarIcon,
  MapPinIcon,
  CurrencyPoundIcon,
  TagIcon,
  CheckIcon,
} from '@heroicons/react/20/solid';
import { Database } from '@/types/database';

type Client = Database['public']['Tables']['clients']['Row'];

export default function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    partner_first_name: '',
    partner_last_name: '',
    email: '',
    phone: '',
    wedding_date: '',
    venue_name: '',
    venue_address: '',
    guest_count: '',
    budget_range: '',
    status: 'lead',
    booking_stage: 'inquiry',
    lead_source: '',
    package_name: '',
    package_price: '',
    deposit_amount: '',
    balance_due: '',
    notes: '',
    internal_notes: '',
  });

  useEffect(() => {
    params.then((p) => {
      setClientId(p.id);
    });
  }, [params]);

  useEffect(() => {
    if (clientId) {
      loadClient();
    }
  }, [clientId]);

  const loadClient = async () => {
    setLoading(true);
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId!)
        .single();

      if (error) throw error;

      if (data) {
        setClient(data);
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          partner_first_name: data.partner_first_name || '',
          partner_last_name: data.partner_last_name || '',
          email: data.email || '',
          phone: data.phone || '',
          wedding_date: data.wedding_date || '',
          venue_name: data.venue_name || '',
          venue_address: data.venue_address || '',
          guest_count: data.guest_count?.toString() || '',
          budget_range: data.budget_range || '',
          status: data.status || 'lead',
          booking_stage: data.booking_stage || 'inquiry',
          lead_source: data.lead_source || '',
          package_name: data.package_name || '',
          package_price: data.package_price?.toString() || '',
          deposit_amount: data.deposit_amount?.toString() || '',
          balance_due: data.balance_due?.toString() || '',
          notes: data.notes || '',
          internal_notes: data.internal_notes || '',
        });
      }
    } catch (error) {
      console.error('Error loading client:', error);
      alert('Failed to load client data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const supabase = await createClient();
      const { data: user } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      const updateData = {
        ...formData,
        guest_count: formData.guest_count
          ? parseInt(formData.guest_count)
          : null,
        package_price: formData.package_price
          ? parseFloat(formData.package_price)
          : null,
        deposit_amount: formData.deposit_amount
          ? parseFloat(formData.deposit_amount)
          : null,
        balance_due: formData.balance_due
          ? parseFloat(formData.balance_due)
          : null,
        wedding_date: formData.wedding_date || null,
        updated_at: new Date().toISOString(),
        last_modified_by: user.id,
      };

      const { error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', clientId!);

      if (error) throw error;

      // Log activity
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id, full_name')
        .eq('user_id', user.id)
        .single();

      await supabase.from('client_activities').insert({
        client_id: clientId!,
        organization_id: profile?.organization_id,
        activity_type: 'client_updated',
        activity_title: 'Client information updated',
        activity_description: 'Client details were modified',
        performed_by: user.id,
        performed_by_name: profile?.full_name || user.email,
      });

      router.push(`/clients/${clientId}`);
    } catch (error) {
      console.error('Error updating client:', error);
      alert('Failed to update client. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-sm text-zinc-500">Loading client data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href={`/clients/${clientId || ''}`}>
          <Button variant="ghost">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Client
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Edit Client
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Update client information and wedding details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <UserIcon className="size-5 text-zinc-500" />
              <h3 className="text-lg font-medium">Contact Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Partner's First Name</Label>
                <Input
                  name="partner_first_name"
                  value={formData.partner_first_name}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label>Partner's Last Name</Label>
                <Input
                  name="partner_last_name"
                  value={formData.partner_last_name}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </div>

        <hr className="border-gray-200" />

        <div className="space-y-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon className="size-5 text-zinc-500" />
              <h3 className="text-lg font-medium">Wedding Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Wedding Date</Label>
                <Input
                  type="date"
                  name="wedding_date"
                  value={formData.wedding_date}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label>Guest Count</Label>
                <Input
                  type="number"
                  name="guest_count"
                  value={formData.guest_count}
                  onChange={handleChange}
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label>Venue Name</Label>
                <Input
                  name="venue_name"
                  value={formData.venue_name}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label>Budget Range</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  name="budget_range"
                  value={formData.budget_range}
                  onChange={handleChange}
                >
                  <option value="">Select budget range</option>
                  <option value="under-10k">Under £10,000</option>
                  <option value="10k-20k">£10,000 - £20,000</option>
                  <option value="20k-30k">£20,000 - £30,000</option>
                  <option value="30k-50k">£30,000 - £50,000</option>
                  <option value="50k-plus">£50,000+</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Venue Address</Label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                name="venue_address"
                value={formData.venue_address}
                onChange={handleChange}
                rows={2}
              />
            </div>
          </div>
        </div>

        <hr className="border-gray-200" />

        <div className="space-y-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <TagIcon className="size-5 text-zinc-500" />
              <h3 className="text-lg font-medium">Booking Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="lead">Lead</option>
                  <option value="booked">Booked</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Booking Stage</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  name="booking_stage"
                  value={formData.booking_stage}
                  onChange={handleChange}
                >
                  <option value="inquiry">Inquiry</option>
                  <option value="quote_sent">Quote Sent</option>
                  <option value="meeting_scheduled">Meeting Scheduled</option>
                  <option value="contract_sent">Contract Sent</option>
                  <option value="booked">Booked</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Lead Source</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  name="lead_source"
                  value={formData.lead_source}
                  onChange={handleChange}
                >
                  <option value="">Select source</option>
                  <option value="website">Website</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="referral">Referral</option>
                  <option value="wedding_fair">Wedding Fair</option>
                  <option value="directory">Directory</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Package Name</Label>
                <Input
                  name="package_name"
                  value={formData.package_name}
                  onChange={handleChange}
                  placeholder="e.g., Full Day Coverage"
                />
              </div>

              <div className="space-y-2">
                <Label>Package Price</Label>
                <div className="relative">
                  <CurrencyPoundIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="number"
                    name="package_price"
                    value={formData.package_price}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Deposit Amount</Label>
                <div className="relative">
                  <CurrencyPoundIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="number"
                    name="deposit_amount"
                    value={formData.deposit_amount}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Balance Due</Label>
                <div className="relative">
                  <CurrencyPoundIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="number"
                    name="balance_due"
                    value={formData.balance_due}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <hr className="border-gray-200" />

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Client Notes</Label>
            <p className="text-sm text-gray-500">
              Notes visible to the client (if connected to WedMe)
            </p>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Internal Notes</Label>
            <p className="text-sm text-gray-500">
              Private notes only visible to your team
            </p>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-amber-50 dark:bg-amber-900/10"
              name="internal_notes"
              value={formData.internal_notes}
              onChange={handleChange}
              rows={4}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Link href={`/clients/${clientId || ''}`}>
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckIcon />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
