import { CommonModule } from '@angular/common';
import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBell,
  lucideCalendarDays,
  lucideChevronDown,
  lucideClipboardList,
  lucideKey,
  lucideLayoutDashboard,
  lucideLogOut,
  lucidePackageSearch,
  lucideShoppingCart,
  lucideSparkles,
  lucideTicket,
  lucideTrendingUp,
  lucideUserRound,
  lucideUsers,
} from '@ng-icons/lucide';

import {
  HlmSidebar,
  HlmSidebarContent,
  HlmSidebarFooter,
  HlmSidebarGroup,
  HlmSidebarGroupLabel,
  HlmSidebarHeader,
  HlmSidebarInset,
  HlmSidebarMenu,
  HlmSidebarMenuButton,
  HlmSidebarMenuItem,
  HlmSidebarTrigger,
  HlmSidebarWrapper,
} from '../../components/sidebar/src';
import { CatalogBranch } from '../../features/shared/models/catalog.model';
import { CatalogApiService } from '../../features/shared/services/catalog-api.service';
import { SessionService } from '../../features/shared/services/session.service';
import { ChatbotComponent } from '../../features/shared/components/chatbot.component';
import { NotificationPushService } from '../../features/shared/services/notification-push.service';

type SidebarItem = {
  label: string;
  route: string;
  icon: string;
  exact?: boolean;
};

type SidebarSection = {
  title?: string;
  items: SidebarItem[];
};

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    NgIcon,
    HlmSidebar,
    HlmSidebarContent,
    HlmSidebarFooter,
    HlmSidebarGroup,
    HlmSidebarGroupLabel,
    HlmSidebarHeader,
    HlmSidebarInset,
    HlmSidebarMenu,
    HlmSidebarMenuButton,
    HlmSidebarMenuItem,
    HlmSidebarTrigger,
    HlmSidebarWrapper,
    ChatbotComponent,
  ],
  providers: [
    provideIcons({
      lucideSparkles,
      lucideBell,
      lucideCalendarDays,
      lucideChevronDown,
      lucideClipboardList,
      lucideKey,
      lucideLayoutDashboard,
      lucideLogOut,
      lucidePackageSearch,
      lucideShoppingCart,
      lucideTicket,
      lucideTrendingUp,
      lucideUserRound,
      lucideUsers,
    }),
  ],
  templateUrl: './app-shell.component.html',
})
export class AppShellComponent {
  private readonly session = inject(SessionService);
  private readonly catalogApi = inject(CatalogApiService);
  protected readonly notifications = inject(NotificationPushService);

  protected readonly branches = signal<CatalogBranch[]>([]);
  protected readonly isUserMenuOpen = signal(false);

  constructor() {
    void this.loadBranches();
  }

  protected readonly fullName = computed(() => {
    const user = this.session.user();
    return user?.name?.trim() ? user.name : 'Usuario';
  });

  protected readonly userEmail = computed(() => {
    return this.session.user()?.email ?? '';
  });

  protected readonly userInitials = computed(() => {
    const name = this.session.user()?.name?.trim();
    if (!name) return 'US';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[1][0]).toUpperCase();
  });

  protected readonly userRole = computed(() => this.session.user()?.rol ?? '-');

  protected readonly userRoleLabel = computed(() => {
    switch (this.userRole()) {
      case 'superadmin':
        return 'Superadministrador Master';
      case 'administrador':
        return 'Administrador';
      case 'cliente':
        return 'Cliente';
      case 'proveedor':
        return 'Proveedor';
      case 'encargado':
        return 'Encargado';
      case 'cajero':
        return 'Cajero';
      case 'delivery':
        return 'Delivery';
      default:
        return 'Sin sesión';
    }
  });

  protected readonly userBranchLabel = computed(() => {
    if (this.userRole() === 'superadmin') {
      return 'Control Maestro SaaS';
    }
    if (this.userRole() === 'administrador') {
      return 'Acceso global';
    }

    const branchId = this.session.user()?.branch_id;
    if (!branchId) {
      return '';
    }

    return this.branches().find((branch) => branch.id === branchId)?.name ?? '';
  });

  protected readonly homeItem = computed(() => {
    switch (this.userRole()) {
      case 'superadmin':
        return { label: 'Tenants', route: '/app/superadmin/tenants', icon: 'lucideLayoutDashboard', exact: true };
      case 'administrador':
        return { label: 'Dashboard', route: '/app/admin', icon: 'lucideLayoutDashboard', exact: true };
      case 'cliente':
        return { label: 'Inicio', route: '/app/cliente', icon: 'lucideUserRound', exact: true };
      case 'proveedor':
        return { label: 'Inicio', route: '/app/proveedor', icon: 'lucideUserRound', exact: true };
      case 'encargado':
        return { label: 'Inicio', route: '/app/encargado', icon: 'lucideUserRound', exact: true };
      case 'cajero':
        return { label: 'Inicio', route: '/app/cajero', icon: 'lucideUserRound', exact: true };
      case 'delivery':
        return { label: 'Inicio', route: '/app/delivery', icon: 'lucideUserRound', exact: true };
      default:
        return { label: 'Inicio', route: '/app/perfil', icon: 'lucideUserRound', exact: true };
    }
  });

  protected readonly profileItem = {
    label: 'Mi perfil',
    route: '/app/perfil',
    icon: 'lucideUserRound',
    exact: true,
  };

  protected readonly sidebarSections = computed<SidebarSection[]>(() => {
    switch (this.userRole()) {
      case 'superadmin':
        return [
          {
            title: 'Plataforma SaaS Master',
            items: [
              { label: 'Empresas (Tenants)', route: '/app/superadmin/tenants', icon: 'lucideLayoutDashboard', exact: true },
              { label: 'Planes y Cuotas', route: '/app/superadmin/plans', icon: 'lucideTicket', exact: true },
            ],
          },
        ];
      case 'administrador':
        return [
          {
            title: 'Reportes y Control',
            items: [
              { label: 'Dashboard', route: '/app/admin', icon: 'lucideLayoutDashboard', exact: true },
              { label: 'Reportes', route: '/app/admin/reports', icon: 'lucideClipboardList', exact: true },
              { label: 'Dataset ML (CU22)', route: '/app/admin/ml-dataset', icon: 'lucideSparkles' },
              { label: 'Demanda Predictiva (CU23)', route: '/app/admin/demand-forecast', icon: 'lucideTrendingUp' },
              { label: 'Segmentación K-Means (CU24)', route: '/app/admin/ml-segmentation', icon: 'lucideUsers' },
            ],
          },
          {
            title: 'Catálogo y Productos',
            items: [
              { label: 'Catálogo', route: '/app/admin/catalog', icon: 'lucidePackageSearch' },
              { label: 'Promociones', route: '/app/admin/promotions', icon: 'lucideTicket' },
            ],
          },
          {
            title: 'Inventario y Stock',
            items: [
              { label: 'Inventario', route: '/app/admin/inventory', icon: 'lucidePackageSearch' },
              { label: 'Traslados', route: '/app/admin/transfers', icon: 'lucideClipboardList' },
            ],
          },
          {
            title: 'Ventas y Facturación',
            items: [
              { label: 'Ventas', route: '/app/admin/sales', icon: 'lucideShoppingCart' },
              { label: 'Pedidos / Despachos', route: '/app/admin/orders', icon: 'lucideClipboardList' },
            ],
          },
          {
            title: 'Compras y Proveedores',
            items: [
              { label: 'Proveedores', route: '/app/admin/provider', icon: 'lucideUsers' },
              { label: 'Solicitudes', route: '/app/admin/replenishment', icon: 'lucideClipboardList' },
            ],
          },
          {
            title: 'Usuarios y Accesos',
            items: [
              { label: 'Usuarios', route: '/app/admin/user', icon: 'lucideUsers' },
              { label: 'Sucursales', route: '/app/admin/branch', icon: 'lucideLayoutDashboard' },
            ],
          },
        ];
      case 'proveedor':
        return [
          {
            title: 'Catálogo y Suministro',
            items: [
              this.homeItem(),
              { label: 'Productos', route: '/app/proveedor/products', icon: 'lucidePackageSearch' },
              { label: 'Solicitudes', route: '/app/proveedor/replenishment', icon: 'lucideClipboardList' },
            ],
          },
        ];
      case 'cliente':
        return [
          {
            title: 'Catálogo y Compras',
            items: [
              { label: 'Catálogo', route: '/app/cliente/catalog', icon: 'lucidePackageSearch', exact: true },
              { label: 'Carrito', route: '/app/cliente/cart', icon: 'lucideShoppingCart' },
              { label: 'Pedidos', route: '/app/cliente/orders', icon: 'lucideClipboardList' },
            ],
          },
          {
            title: 'Reservas y Probador',
            items: [
              { label: 'Reservas', route: '/app/cliente/reservations', icon: 'lucideTicket' },
              { label: 'Mis reservas', route: '/app/cliente/my-reservations', icon: 'lucideCalendarDays' },
            ],
          },
        ];
      case 'encargado':
        return [
          {
            title: 'Control y Operación',
            items: [
              this.homeItem(),
              { label: 'Reservas', route: '/app/encargado/reservations', icon: 'lucideCalendarDays' },
            ],
          },
          {
            title: 'Inventario y Traslados',
            items: [
              { label: 'Inventario', route: '/app/encargado/inventory', icon: 'lucidePackageSearch' },
              { label: 'Traslados', route: '/app/encargado/transfers', icon: 'lucideClipboardList' },
              { label: 'Promociones', route: '/app/encargado/promotions', icon: 'lucideTicket' },
            ],
          },
          {
            title: 'Ventas y Despachos',
            items: [
              { label: 'Ventas', route: '/app/encargado/sales', icon: 'lucideShoppingCart' },
              { label: 'Pedidos', route: '/app/encargado/orders', icon: 'lucideClipboardList' },
              { label: 'Conflictos Offline', route: '/app/encargado/sale-conflicts', icon: 'lucideClipboardList' },
            ],
          },
          {
            title: 'Compras y Proveedores',
            items: [
              { label: 'Proveedores', route: '/app/encargado/providers', icon: 'lucideUsers' },
              { label: 'Solicitudes', route: '/app/encargado/replenishment', icon: 'lucideClipboardList' },
            ],
          },
          {
            title: 'Reportes y Estadísticas',
            items: [
              { label: 'Reportes', route: '/app/encargado/reports', icon: 'lucideClipboardList', exact: true },
            ],
          },
        ];
      case 'cajero':
        return [
          {
            title: 'Punto de Venta y Caja',
            items: [
              this.homeItem(),
              { label: 'Caja', route: '/app/cajero/caja', icon: 'lucideShoppingCart' },
              { label: 'Ventas', route: '/app/cajero/sales', icon: 'lucideClipboardList' },
            ],
          },
        ];
      default:
        return [
          {
            title: 'Navegación',
            items: [this.homeItem()],
          },
        ];
    }
  });

  protected toggleUserMenu(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.isUserMenuOpen.update((open) => !open);
  }

  protected closeUserMenu(): void {
    this.isUserMenuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('#user-menu-trigger') && !target?.closest('#user-menu-dropdown')) {
      this.closeUserMenu();
    }
  }

  protected async logout(): Promise<void> {
    this.closeUserMenu();
    await this.notifications.logout();
    await this.session.logout(true);
  }

  private async loadBranches(): Promise<void> {
    try {
      const response = await firstValueFrom(this.catalogApi.listPublicBranches());
      this.branches.set(response.data ?? []);
    } catch {
      this.branches.set([]);
    }
  }
}
