from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.files import File
from django.core.management.base import BaseCommand

from cms.models import (
    ContentBlock,
    FormDefinition,
    FormField,
    Page,
    PageBlock,
    SiteSettings,
)

User = get_user_model()


HOME_WHY = (
    "Diamond State Softball League was created so LGBTQ+ athletes and allies in "
    "Little Rock, Arkansas can play competitive and recreational softball in a "
    "welcoming community. Too many people were looking for a team where they could "
    "be themselves — on the diamond and off. DSS builds that space: inclusive "
    "rosters, fair play, and a culture rooted in belonging."
)

HOME_INFO = (
    "Whether you are a seasoned player, brand new to softball, or want to "
    "volunteer and support, we want to hear from you. Reach out through our "
    "interest form, follow league updates, and come meet teammates who share "
    "the motto: Play · Support · Belong."
)

ABOUT_BODY = (
    "Based in Little Rock, Diamond State Softball League brings together "
    "LGBTQ+ players, friends, and allies for a season of softball that values "
    "skill, sportsmanship, and community. The league exists because local "
    "athletes asked for a place that celebrates queer joy in sports without "
    "compromising competitive spirit.\n\n"
    "We organize practices, games, and social events that make it easy to get "
    "involved — as a player, coach, umpire, sponsor, or fan. New members are "
    "always welcome; experience levels vary, and we help people find the right "
    "fit on a roster.\n\n"
    "If you are looking for schedules, registration timing, or ways to help, "
    "start with the Contact page and share a little about yourself. League "
    "organizers review every interest submission and follow up with next steps."
)


class Command(BaseCommand):
    help = "Seed site settings, starter pages, blocks, interest form, and admin user."

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            default="admin",
            help="Staff username (default: admin)",
        )
        parser.add_argument(
            "--password",
            default="changeme",
            help="Staff password (default: changeme)",
        )

    def handle(self, *args, **options):
        username = options["username"]
        password = options["password"]

        user, created = User.objects.get_or_create(
            username=username,
            defaults={"is_staff": True, "is_superuser": True, "email": "admin@example.com"},
        )
        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f"Created admin user '{username}'"))
        else:
            user.is_staff = True
            user.is_superuser = True
            user.save()
            self.stdout.write(f"Admin user '{username}' already exists")

        settings_obj = SiteSettings.get_solo()
        settings_obj.league_name = "Diamond State Softball League"
        settings_obj.location = "Little Rock, Arkansas"
        settings_obj.motto = "Play · Support · Belong"
        logo_candidates = [
            Path(__file__).resolve().parents[3] / "media" / "branding" / "logo.png",
            Path(__file__).resolve().parents[4] / "league-logo.png",
            Path(__file__).resolve().parents[4] / "frontend" / "public" / "logo.png",
        ]
        logo_path = next((p for p in logo_candidates if p.exists()), None)
        if logo_path and not settings_obj.logo:
            with logo_path.open("rb") as fh:
                settings_obj.logo.save("logo.png", File(fh), save=False)
        settings_obj.save()
        self.stdout.write("Site settings ready")

        form, _ = FormDefinition.objects.update_or_create(
            slug="interest",
            defaults={
                "name": "Express Interest",
                "intro_text": (
                    "Tell us how you would like to get involved with Diamond State "
                    "Softball League. We store your message securely and follow up."
                ),
                "success_message": (
                    "Thanks for your interest in Diamond State Softball League! "
                    "We will be in touch soon."
                ),
                "is_active": True,
                "email_enabled": False,
            },
        )
        field_specs = [
            ("full_name", "Full name", "text", True, [], "Your name"),
            ("email", "Email", "email", True, [], "you@example.com"),
            ("phone", "Phone", "phone", False, [], "(501) 555-0100"),
            (
                "interest_type",
                "I am interested in",
                "select",
                True,
                ["Playing", "Coaching", "Volunteering", "Sponsoring", "Spectating / supporting"],
                "",
            ),
            (
                "experience",
                "Softball experience",
                "select",
                False,
                ["None yet", "Recreational", "Competitive / travel", "Prefer not to say"],
                "",
            ),
            ("message", "Anything else we should know?", "textarea", False, [], "Optional message"),
            ("opt_in", "Keep me updated about the league", "checkbox", False, [], ""),
        ]
        form.fields.all().delete()
        for order, (key, label, ftype, required, options, placeholder) in enumerate(field_specs):
            FormField.objects.create(
                form=form,
                field_key=key,
                label=label,
                field_type=ftype,
                required=required,
                options=options,
                placeholder=placeholder,
                order=order,
            )
        self.stdout.write("Interest form ready")

        blocks = {}
        specs = [
            (
                "home-hero",
                ContentBlock.BlockType.HERO,
                {
                    "headline": "Diamond State Softball League",
                    "subheadline": "LGBTQ+ softball in Little Rock — Play · Support · Belong",
                    "show_logo": True,
                    "cta_label": "Express interest",
                    "cta_href": "/contact",
                },
            ),
            (
                "home-why",
                ContentBlock.BlockType.RICH_TEXT,
                {"heading": "Why we exist", "body": HOME_WHY},
            ),
            (
                "home-info",
                ContentBlock.BlockType.RICH_TEXT,
                {"heading": "How to get involved", "body": HOME_INFO},
            ),
            (
                "home-cta",
                ContentBlock.BlockType.CTA,
                {
                    "heading": "Ready to join the diamond?",
                    "body": "Share your interest and a league organizer will follow up.",
                    "button_label": "Contact the league",
                    "button_href": "/contact",
                },
            ),
            (
                "about-body",
                ContentBlock.BlockType.RICH_TEXT,
                {"heading": "About the league", "body": ABOUT_BODY},
            ),
            (
                "contact-intro",
                ContentBlock.BlockType.RICH_TEXT,
                {
                    "heading": "Get information",
                    "body": (
                        "Use the form below to express interest in playing, coaching, "
                        "volunteering, or supporting Diamond State Softball League in "
                        "Little Rock. Submissions are stored for league organizers."
                    ),
                },
            ),
            (
                "interest-form",
                ContentBlock.BlockType.FORM,
                {"form_slug": "interest"},
            ),
        ]
        for name, block_type, content in specs:
            block, _ = ContentBlock.objects.update_or_create(
                name=name,
                defaults={"block_type": block_type, "content": content, "is_active": True},
            )
            blocks[name] = block

        pages = [
            ("home", "Home", "Home", 0, "", ["home-hero", "home-why", "home-info", "home-cta"]),
            ("about", "About", "About", 1, "About Diamond State Softball League", ["about-body"]),
            (
                "contact",
                "Contact",
                "Contact",
                2,
                "Express interest in Diamond State Softball League",
                ["contact-intro", "interest-form"],
            ),
        ]
        for slug, title, nav_label, order, meta, block_names in pages:
            page, _ = Page.objects.update_or_create(
                slug=slug,
                defaults={
                    "title": title,
                    "nav_label": nav_label,
                    "is_published": True,
                    "show_in_nav": True,
                    "nav_order": order,
                    "meta_description": meta,
                },
            )
            page.page_blocks.all().delete()
            for idx, bname in enumerate(block_names):
                PageBlock.objects.create(page=page, block=blocks[bname], order=idx)

        self.stdout.write(self.style.SUCCESS("Seed complete: Home, About, Contact"))
