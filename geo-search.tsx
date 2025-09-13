import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Search, MapPin } from 'lucide-react';

const geoSearchSchema = z.object({
  location: z.string().optional(),
  radius: z.number().min(1).max(1000).default(50),
  category: z.string().optional(),
});

type GeoSearchValues = z.infer<typeof geoSearchSchema>;

interface GeoSearchProps {
  onSearch: (data: GeoSearchValues) => void;
  isLoading?: boolean;
}

export function GeoSearch({ onSearch, isLoading = false }: GeoSearchProps) {
  const form = useForm<GeoSearchValues>({
    resolver: zodResolver(geoSearchSchema),
    defaultValues: {
      location: '',
      radius: 50,
      category: '',
    },
  });

  const [searchAttempted, setSearchAttempted] = useState(false);

  function onSubmit(data: GeoSearchValues) {
    setSearchAttempted(true);
    onSearch(data);
  }

  return (
    <div className="p-4 bg-card rounded-lg shadow-sm border mb-6">
      <h3 className="font-semibold text-lg mb-4 flex items-center">
        <MapPin className="mr-2 h-5 w-5 text-primary" />
        Geographic Search
      </h3>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="City, region, or country" {...field} />
                  </FormControl>
                  <FormDescription>
                    Enter a location to search nearby
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="radius"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Radius (km)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      placeholder="50"
                      {...field}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value)) {
                          field.onChange(value);
                        }
                      }}
                    />
                  </FormControl>
                  <FormDescription>Search radius in kilometers</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">All categories</SelectItem>
                      <SelectItem value="hemp">Hemp</SelectItem>
                      <SelectItem value="cannabis">Cannabis</SelectItem>
                      <SelectItem value="extract">Extract</SelectItem>
                      <SelectItem value="seed">Seeds</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>Filter by product category</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Search Nearby Listings
              </>
            )}
          </Button>
        </form>
      </Form>

      {searchAttempted && !isLoading && (
        <div className="mt-4 text-sm text-muted-foreground text-center">
          You can adjust the radius to find more results
        </div>
      )}
    </div>
  );
}