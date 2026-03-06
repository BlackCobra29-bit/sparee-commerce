from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("App", "0017_alter_product_vin"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="siteannouncement",
            name="is_active",
        ),
    ]
