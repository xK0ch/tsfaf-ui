import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import type { TeamMember } from '../ueber-uns';

@Component({
  selector: 'app-team-card',
  templateUrl: './team-card.html',
  styleUrl: './team-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamCard {
  readonly member = input.required<TeamMember>();

  protected readonly bioOpen = signal(false);

  protected readonly initials = computed(() =>
    this.member()
      .name.split(' ')
      .map(part => part.charAt(0))
      .join(''),
  );

  protected readonly avatarBackground = computed(() =>
    this.member().variant === 'orange'
      ? 'var(--color-primary)'
      : 'var(--color-secondary)',
  );

  protected toggleBio(): void {
    this.bioOpen.update(v => !v);
  }
}
